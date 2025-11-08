require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
const bcrypt = require('bcrypt');
const dbModule = require('./database');
const https = require('https');
const http = require('http');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;

// Railway 프록시 환경 설정
app.set('trust proxy', 1); // Railway 프록시 신뢰

// 네이버 API 키
const NAVER_CLIENT_ID = 'ub4zAdL_qPNteEBKd9IK';
const NAVER_CLIENT_SECRET = 'aXawnwfFZJ';

// Google API 키 (유료이므로 사용하지 않음)
// https://console.cloud.google.com/apis/credentials
// const GOOGLE_API_KEY = '';

// 세션 설정
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-secret-key-change-this-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: process.env.NODE_ENV === 'production' || process.env.RAILWAY_ENVIRONMENT === 'production' || process.env.RAILWAY === 'true', // Railway는 항상 HTTPS
        httpOnly: true,
        sameSite: 'lax', // CSRF 보호 및 쿠키 전송 보장
        maxAge: 24 * 60 * 60 * 1000, // 24시간
        domain: undefined, // Railway 도메인에 맞게 자동 설정
        path: '/' // 모든 경로에서 쿠키 사용
    }
}));

// 미들웨어
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname)));

let db = null;

// 데이터베이스 초기화 및 admin 계정 생성
dbModule.initDatabase()
    .then(async (database) => {
        db = database;
        console.log('데이터베이스 초기화 완료');
        
        // admin 계정 생성 (없으면)
        try {
            const adminUser = await dbModule.getUserByUsername(db, 'admin');
            if (!adminUser) {
                const adminPasswordHash = await bcrypt.hash('123456', 10);
                await dbModule.addUser(db, 'admin', adminPasswordHash);
                console.log('✅ admin 계정이 생성되었습니다.');
            } else {
                console.log('✅ admin 계정이 이미 존재합니다.');
            }
        } catch (err) {
            console.error('admin 계정 생성 오류:', err);
        }
    })
    .catch((err) => {
        console.error('데이터베이스 초기화 실패:', err);
        process.exit(1);
    });

// 로그인 상태 확인 (패스워드 포함)
app.get('/api/auth/me', async (req, res) => {
    try {
        console.log('세션 확인 요청:', {
            sessionId: req.sessionID,
            userId: req.session.userId,
            username: req.session.username,
            cookie: req.headers.cookie ? '있음' : '없음'
        });
        
        if (req.session.userId) {
            const user = await dbModule.getUserById(db, req.session.userId);
            if (!user) {
                console.log('사용자를 찾을 수 없음:', req.session.userId);
                return res.json({ success: false, user: null, error: '사용자를 찾을 수 없습니다.' });
            }
            // 전체 사용자 정보 가져오기 (패스워드 포함)
            const fullUser = await dbModule.getUserByUsername(db, user.username);
            if (!fullUser) {
                console.log('전체 사용자 정보를 가져올 수 없음:', user.username);
                return res.json({ success: false, user: null, error: '사용자 정보를 가져올 수 없습니다.' });
            }
            console.log('✅ 세션 확인 성공:', fullUser.username);
            res.json({ success: true, user: fullUser });
        } else {
            console.log('⚠️ 세션이 없음 - 로그인 필요');
            res.json({ success: false, user: null, error: '로그인이 필요합니다.' });
        }
    } catch (err) {
        console.error('로그인 상태 확인 오류:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 회원가입 (가게 정보 포함)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, username, password, store } = req.body;
        
        if (!name || !username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: '성명, 아이디, 비밀번호를 입력해주세요.' 
            });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ 
                success: false, 
                error: '아이디는 3자 이상이어야 합니다.' 
            });
        }
        
        if (password.length < 4) {
            return res.status(400).json({ 
                success: false, 
                error: '비밀번호는 4자 이상이어야 합니다.' 
            });
        }
        
        if (!store || !store.name || !store.category || !store.address || 
            store.latitude === undefined || store.longitude === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: '가게 정보를 모두 입력해주세요.' 
            });
        }
        
        const passwordHash = await bcrypt.hash(password, 10);
        const userEmail = store.email || null;
        const userName = name.trim() || null;
        const user = await dbModule.addUser(db, username, passwordHash, userEmail, userName);
        
        // 가게 정보 저장
        const storeData = await dbModule.addStore(db, {
            user_id: user.id,
            name: store.name,
            address: store.address,
            road_address: store.road_address || null,
            lot_address: store.lot_address || null,
            latitude: parseFloat(store.latitude),
            longitude: parseFloat(store.longitude),
            phone: store.phone || null,
            email: store.email || null,
            category: store.category,
            description: store.description || null
        });
        
        // 자동 로그인
        req.session.userId = user.id;
        req.session.username = user.username;
        
        res.status(201).json({ 
            success: true, 
            user: { id: user.id, username: user.username } 
        });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 로그인
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ 
                success: false, 
                error: '아이디와 비밀번호를 입력해주세요.' 
            });
        }
        
        const user = await dbModule.getUserByUsername(db, username);
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                error: '아이디 또는 비밀번호가 올바르지 않습니다.' 
            });
        }
        
        console.log('로그인 시도:', {
            username: username,
            passwordLength: password ? password.length : 0,
            userPasswordHashLength: user.password ? user.password.length : 0,
            isTempPassword: user.is_temp_password === 1
        });
        
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        console.log('비밀번호 비교 결과:', passwordMatch ? '일치' : '불일치');
        
        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                error: '아이디 또는 비밀번호가 올바르지 않습니다.' 
            });
        }
        
        req.session.userId = user.id;
        req.session.username = user.username;
        
        console.log('✅ 로그인 성공 - 세션 설정:', {
            sessionId: req.sessionID,
            userId: req.session.userId,
            username: req.session.username
        });
        
        // 세션 저장 확인
        req.session.save((err) => {
            if (err) {
                console.error('세션 저장 오류:', err);
            } else {
                console.log('세션 저장 완료');
            }
        });
        
        // 임시 비밀번호 사용 여부 확인
        const isTempPassword = user.is_temp_password === 1;
        
        res.json({ 
            success: true, 
            user: { id: user.id, username: user.username },
            isTempPassword: isTempPassword
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 로그아웃
app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ success: false, error: err.message });
        }
        res.json({ success: true });
    });
});

// 비밀번호 찾기 (이메일로 비밀번호 전송)
app.post('/api/auth/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({ 
                success: false, 
                error: '이메일을 입력해주세요.' 
            });
        }
        
        // 이메일로 사용자 찾기
        const user = await dbModule.getUserByEmail(db, email);
        
        if (!user) {
            console.warn('비밀번호 찾기 요청 - 이메일 미등록:', email);
            return res.status(404).json({ 
                success: false, 
                error: '입력하신 이메일로 등록된 계정이 없습니다. 가입 시 입력한 이메일을 확인해주세요.' 
            });
        }
        
        // 이메일 설정 확인 (보안상 필수)
        const emailUser = process.env.EMAIL_USER ? process.env.EMAIL_USER.trim() : '';
        const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.trim() : '';
        
        // 이메일 전송 설정 (SMTP 서버 설정 필요)
        // Gmail을 사용하는 경우: https://support.google.com/accounts/answer/185833
        const trimmedUser = emailUser.trim();
        const trimmedPass = emailPass.trim();
        
        console.log('이메일 설정 확인:', {
            emailUser: trimmedUser ? `${trimmedUser.substring(0, 3)}***` : '없음',
            emailUserFull: trimmedUser, // 디버깅용 (실제 이메일 주소 확인)
            emailPassLength: trimmedPass ? trimmedPass.length : 0,
            emailPassPreview: trimmedPass ? `${trimmedPass.substring(0, 2)}***${trimmedPass.substring(trimmedPass.length - 2)}` : '없음',
            emailPassHasSpaces: trimmedPass.includes(' '),
            emailPassHasSpecialChars: /[^a-zA-Z0-9]/.test(trimmedPass)
        });
        
        if (!trimmedUser || !trimmedPass) {
            console.log('⚠️ 이메일 설정이 없어 비밀번호 찾기 기능을 사용할 수 없습니다.');
            console.log('   .env 파일에 EMAIL_USER와 EMAIL_PASS를 설정하세요.');
            console.log('   Gmail 앱 비밀번호 생성: https://support.google.com/accounts/answer/185833');
            return res.status(503).json({ 
                success: false, 
                error: '이메일 서버가 설정되지 않아 비밀번호 찾기 기능을 사용할 수 없습니다.\n\n설정 방법:\n1. store 폴더의 .env 파일 열기\n2. EMAIL_USER=your-email@gmail.com 입력\n3. EMAIL_PASS=your-app-password 입력\n4. 서버 재시작\n\nGmail 앱 비밀번호 생성: https://support.google.com/accounts/answer/185833' 
            });
        }
        
        // 새 임시 비밀번호 생성 (영문 대소문자 + 숫자, 12자리)
        const generateTempPassword = () => {
            const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            let password = '';
            for (let i = 0; i < 12; i++) {
                password += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            return password;
        };
        const tempPassword = generateTempPassword();
        const tempPasswordHash = await bcrypt.hash(tempPassword, 10);
        
        console.log('임시 비밀번호 생성 완료:', {
            userId: user.id,
            username: user.username
        });
        
        const previousPasswordHash = user.password;
        const previousTempFlag = user.is_temp_password === 1;
        
        try {
            await dbModule.updateUserPassword(db, user.id, tempPasswordHash, true);
        } catch (updateError) {
            console.error('임시 비밀번호 업데이트 오류:', updateError);
            return res.status(500).json({ 
                success: false, 
                error: '임시 비밀번호를 설정하지 못했습니다. 잠시 후 다시 시도해주세요.' 
            });
        }
        
        // 해시 검증 테스트
        const verifyHash = await bcrypt.compare(tempPassword, tempPasswordHash);
        console.log('임시 비밀번호 해시 검증:', verifyHash ? '성공' : '실패');
        
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            host: 'smtp.gmail.com',
            port: 587,
            secure: false, // true for 465, false for other ports
            auth: {
                user: trimmedUser,
                pass: trimmedPass
            },
            tls: {
                rejectUnauthorized: false
            },
            connectionTimeout: 10000, // 10초
            greetingTimeout: 10000,   // 10초
            socketTimeout: 15000      // 15초
        });
        
        // 이메일 전송
        try {
            console.log('📧 이메일 전송 시도:', {
                from: emailUser,
                to: email,
                user: user.username
            });
            
            const mailOptions = {
                from: emailUser,
                to: email,
                subject: '[가게 찾기] 비밀번호 재설정',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <h2 style="color: #333;">비밀번호 재설정</h2>
                        <p>안녕하세요, ${user.username}님.</p>
                        <p>요청하신 비밀번호 재설정을 완료했습니다.</p>
                        <p style="background: #f5f5f5; padding: 15px; border-radius: 5px; font-size: 18px; font-weight: bold; color: #667eea;">
                            임시 비밀번호: <strong>${tempPassword}</strong>
                        </p>
                        <p>로그인 후 비밀번호를 변경해주시기 바랍니다.</p>
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                            이 메일은 자동으로 발송된 메일입니다. 요청하지 않으셨다면 무시해주세요.
                        </p>
                    </div>
                `
            };
            
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ 임시 비밀번호 이메일 전송 완료:', {
                to: email,
                messageId: info.messageId,
                response: info.response
            });
        } catch (emailError) {
            console.error('이메일 전송 오류:', emailError);
            console.error('오류 상세:', {
                code: emailError.code,
                command: emailError.command,
                response: emailError.response,
                responseCode: emailError.responseCode
            });
            
            // 이메일 전송 실패 시 기존 비밀번호로 롤백
            try {
                await dbModule.updateUserPassword(db, user.id, previousPasswordHash, previousTempFlag);
                console.log('임시 비밀번호 롤백 완료:', { userId: user.id });
            } catch (rollbackError) {
                console.error('임시 비밀번호 롤백 실패:', rollbackError);
            }
            
            let errorMessage = '이메일 전송에 실패했습니다.';
            
            // 구체적인 오류 메시지 제공
            if (emailError.code === 'EAUTH' || emailError.responseCode === 535) {
                errorMessage = 'Gmail 인증에 실패했습니다.\n\n확인 사항:\n1. Google 계정 → 보안 → 2단계 인증이 활성화되어 있는지 확인\n2. 앱 비밀번호가 올바른지 확인 (16자리, 공백 없이)\n3. 앱 비밀번호 재생성: https://myaccount.google.com/apppasswords\n   - "앱 선택" → "기타(맞춤 이름)" → "메일" 입력\n   - 생성된 16자리 비밀번호를 복사 (공백 제거)\n4. .env 파일 확인:\n   - EMAIL_USER=your-email@gmail.com (정확한 이메일 주소)\n   - EMAIL_PASS=앱비밀번호16자리 (공백 없이)\n5. 서버 재시작\n\n참고: 앱 비밀번호는 Google 계정 비밀번호가 아닙니다!';
            } else if (emailError.code === 'ETIMEDOUT' || emailError.code === 'ECONNECTION' || emailError.code === 'ESOCKET' || emailError.code === 'ECONNRESET') {
                errorMessage = '이메일 서버 연결이 지연되거나 실패했습니다.\n\n확인 사항:\n1. 네트워크 연결 및 방화벽을 확인하세요.\n2. Railway Variables에 EMAIL_USER/EMAIL_PASS가 정확히 설정되었는지 확인하세요.\n3. Gmail Security에서 2단계 인증과 앱 비밀번호가 활성화되어 있는지 확인하세요.\n4. 문제가 계속되면 새 앱 비밀번호를 발급받아 다시 설정하세요.';
            } else if (emailError.code === 'ECONNECTION') {
                errorMessage = '이메일 서버에 연결할 수 없습니다. 인터넷 연결을 확인하세요.';
            } else if (emailError.response) {
                errorMessage = `이메일 전송 오류: ${emailError.response}`;
            }
            
            return res.status(500).json({ 
                success: false, 
                error: errorMessage 
            });
        }
        
        res.json({ 
            success: true, 
            message: '입력하신 이메일로 임시 비밀번호를 전송했습니다. 이메일을 확인해주세요.' 
        });
    } catch (err) {
        console.error('비밀번호 찾기 오류:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 이메일 업데이트
app.post('/api/auth/update-email', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.' 
            });
        }
        
        const { email } = req.body;
        
        // 이메일 형식 검증 (선택사항이므로 빈 값도 허용)
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ 
                success: false, 
                error: '올바른 이메일 형식을 입력해주세요.' 
            });
        }
        
        await dbModule.updateUserEmail(db, req.session.userId, email || null);
        
        res.json({ success: true, message: '이메일이 업데이트되었습니다.' });
    } catch (err) {
        console.error('이메일 업데이트 오류:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 프로필 업데이트 (성명, 이메일)
app.post('/api/auth/update-profile', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.' 
            });
        }
        
        const { name, email } = req.body;
        
        // 이메일 형식 검증 (선택사항이므로 빈 값도 허용)
        if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ 
                success: false, 
                error: '올바른 이메일 형식을 입력해주세요.' 
            });
        }
        
        // 성명 업데이트
        if (name !== undefined) {
            await dbModule.updateUserName(db, req.session.userId, name.trim() || null);
        }
        
        // 이메일 업데이트
        if (email !== undefined) {
            await dbModule.updateUserEmail(db, req.session.userId, email || null);
        }
        
        res.json({ success: true, message: '프로필이 업데이트되었습니다.' });
    } catch (err) {
        console.error('프로필 업데이트 오류:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 비밀번호 변경
app.post('/api/auth/change-password', async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.' 
            });
        }
        
        const { currentPassword, newPassword } = req.body;
        
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ 
                success: false, 
                error: '현재 비밀번호와 새 비밀번호를 입력해주세요.' 
            });
        }
        
        if (newPassword.length < 4) {
            return res.status(400).json({ 
                success: false, 
                error: '새 비밀번호는 4자 이상이어야 합니다.' 
            });
        }
        
        const user = await dbModule.getUserById(db, req.session.userId);
        const fullUser = await dbModule.getUserByUsername(db, user.username);
        
        const passwordMatch = await bcrypt.compare(currentPassword, fullUser.password);
        
        if (!passwordMatch) {
            return res.status(401).json({ 
                success: false, 
                error: '현재 비밀번호가 올바르지 않습니다.' 
            });
        }
        
        const newPasswordHash = await bcrypt.hash(newPassword, 10);
        // 비밀번호 변경 시 임시 비밀번호 플래그 해제
        await dbModule.updateUserPassword(db, req.session.userId, newPasswordHash, false);
        
        res.json({ success: true, message: '비밀번호가 변경되었습니다.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 모든 회원 조회 (admin만 접근 가능)
app.get('/api/users', async (req, res) => {
    try {
        if (!req.session.userId) {
            console.log('회원 목록 조회 실패: 로그인 필요');
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.' 
            });
        }
        
        const user = await dbModule.getUserById(db, req.session.userId);
        if (!user) {
            console.log('회원 목록 조회 실패: 사용자 정보 없음');
            return res.status(401).json({ 
                success: false, 
                error: '사용자 정보를 찾을 수 없습니다.' 
            });
        }
        
        const fullUser = await dbModule.getUserByUsername(db, user.username);
        if (!fullUser) {
            console.log('회원 목록 조회 실패: 전체 사용자 정보 없음');
            return res.status(401).json({ 
                success: false, 
                error: '사용자 정보를 가져올 수 없습니다.' 
            });
        }
        
        // admin만 접근 가능
        if (fullUser.username !== 'admin') {
            console.log('회원 목록 조회 실패: 관리자 권한 없음', fullUser.username);
            return res.status(403).json({ 
                success: false, 
                error: '관리자만 접근할 수 있습니다.' 
            });
        }
        
        console.log('회원 목록 조회 시작 (admin)');
        
        // 데이터베이스 연결 확인
        if (!db) {
            console.error('데이터베이스 연결이 없습니다.');
            return res.status(500).json({ 
                success: false, 
                error: '데이터베이스 연결 오류' 
            });
        }
        
        const users = await dbModule.getAllUsers(db);
        console.log('회원 목록 조회 성공:', users.length, '명');
        res.json({ success: true, data: users });
    } catch (err) {
        console.error('회원 목록 조회 오류:', err);
        console.error('에러 스택:', err.stack);
        res.status(500).json({ 
            success: false, 
            error: err.message || '서버 오류가 발생했습니다.' 
        });
    }
});

// 모든 가게 조회 (admin은 전체, 일반 사용자는 자신의 가게만, 비로그인 시 전체)
app.get('/api/stores', async (req, res) => {
    try {
        let userId = null;
        if (req.session.userId) {
            const user = await dbModule.getUserById(db, req.session.userId);
            // admin이 아니면 자신의 가게만 조회
            if (user.username !== 'admin') {
                userId = req.session.userId;
            }
            // admin이면 userId를 null로 유지하여 전체 조회
        }
        const stores = await dbModule.getAllStores(db, userId);
        res.json({ success: true, data: stores });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 특정 가게 조회
app.get('/api/stores/:id', async (req, res) => {
    try {
        const store = await dbModule.getStoreById(db, req.params.id);
        console.log('가게 정보 조회:', {
            id: store.id,
            name: store.name,
            user_id: store.user_id,
            user_username: store.user_username,
            user_name: store.user_name
        });
        res.json({ success: true, data: store });
    } catch (err) {
        console.error('가게 정보 조회 오류:', err);
        res.status(404).json({ success: false, error: err.message });
    }
});

// 가게 추가
app.post('/api/stores', async (req, res) => {
    try {
        const { name, address, road_address, lot_address, latitude, longitude, phone, email, category, description } = req.body;
        
        // 필수 필드 검증
        if (!name || !address || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: '가게명, 주소, 위도, 경도는 필수 입력 항목입니다.' 
            });
        }

        // user_id 결정: 로그인한 사용자가 있으면 사용, 없으면 null
        let userId = null;
        if (req.session.userId) {
            const user = await dbModule.getUserById(db, req.session.userId);
            if (user) {
                userId = user.id;
            }
        }

        const store = await dbModule.addStore(db, {
            user_id: userId,
            name,
            address,
            road_address,
            lot_address,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            phone,
            email,
            category,
            description
        });

        res.status(201).json({ success: true, data: store });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 가게 수정
app.put('/api/stores/:id', async (req, res) => {
    try {
        const { name, address, road_address, lot_address, latitude, longitude, phone, email, category, description, user_name } = req.body;
        
        // 필수 필드 검증
        if (!name || !address || latitude === undefined || longitude === undefined) {
            return res.status(400).json({ 
                success: false, 
                error: '가게명, 주소, 위도, 경도는 필수 입력 항목입니다.' 
            });
        }

        let userId = req.session.userId || null;
        let isAdmin = false;
        
        // admin인 경우 userId를 null로 설정하여 모든 가게 수정 가능
        if (req.session.userId) {
            const user = await dbModule.getUserById(db, req.session.userId);
            if (user) {
                const fullUser = await dbModule.getUserByUsername(db, user.username);
                if (fullUser && fullUser.username === 'admin') {
                    userId = null; // admin은 모든 가게 수정 가능
                    isAdmin = true;
                }
            }
        }
        
        // 가게 정보 가져오기 (user_id 확인용)
        const store = await dbModule.getStoreById(db, req.params.id);
        
        // 성명 업데이트 (admin이고 user_name이 제공된 경우)
        if (isAdmin && user_name !== undefined && store && store.user_id) {
            await dbModule.updateUserName(db, store.user_id, user_name);
        }
        
        const updatedStore = await dbModule.updateStore(db, req.params.id, {
            name,
            address,
            road_address,
            lot_address,
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
            phone,
            email,
            category,
            description
        }, userId);

        res.json({ success: true, data: updatedStore });
    } catch (err) {
        if (err.message === '가게를 찾을 수 없습니다.') {
            res.status(404).json({ success: false, error: err.message });
        } else {
            res.status(500).json({ success: false, error: err.message });
        }
    }
});

// 가게 삭제
// 회원 삭제 (관리자만)
app.delete('/api/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        
        // 인증 확인
        if (!req.session.userId) {
            return res.status(401).json({ 
                success: false, 
                error: '로그인이 필요합니다.' 
            });
        }
        
        // admin 권한 확인
        const user = await dbModule.getUserById(db, req.session.userId);
        if (!user || user.username !== 'admin') {
            return res.status(403).json({ 
                success: false, 
                error: '관리자만 회원을 삭제할 수 있습니다.' 
            });
        }
        
        // 자기 자신은 삭제 불가
        if (userId === req.session.userId) {
            return res.status(400).json({ 
                success: false, 
                error: '자기 자신은 삭제할 수 없습니다.' 
            });
        }
        
        // 사용자 삭제 (관련 가게도 함께 삭제됨)
        await dbModule.deleteUser(db, userId);
        res.json({ success: true, message: '회원이 삭제되었습니다.' });
    } catch (err) {
        console.error('회원 삭제 오류:', err);
        if (err.message === '사용자를 찾을 수 없습니다.') {
            res.status(404).json({ success: false, error: err.message });
        } else {
            res.status(500).json({ success: false, error: err.message });
        }
    }
});

app.delete('/api/stores/:id', async (req, res) => {
    try {
        const storeId = req.params.id;
        const isFromAdminPage = req.headers['x-admin-page'] === 'true';
        
        console.log('가게 삭제 요청:', { storeId, sessionUserId: req.session.userId, isFromAdminPage });
        
        // 먼저 가게가 존재하는지 확인
        const store = await dbModule.getStoreById(db, storeId);
        if (!store) {
            return res.status(404).json({ 
                success: false, 
                error: '가게를 찾을 수 없습니다.' 
            });
        }
        
        let userId = null;
        let isAdmin = false;
        
        // admin 페이지에서 온 요청이면 무조건 admin 권한으로 처리
        if (isFromAdminPage) {
            isAdmin = true;
            userId = null; // admin 권한으로 명시적으로 설정
            console.log('Admin 페이지에서 가게 삭제 시도 (관리자 권한):', { storeId, storeUserId: store.user_id });
        } else {
            // 일반 페이지에서 온 요청인 경우
            if (req.session.userId) {
                try {
                    const user = await dbModule.getUserById(db, req.session.userId);
                    if (user) {
                        // admin 여부 확인
                        const fullUser = await dbModule.getUserByUsername(db, user.username);
                        if (fullUser && fullUser.username === 'admin') {
                            isAdmin = true;
                            console.log('Admin 사용자가 가게 삭제 시도:', { storeId, storeUserId: store.user_id });
                        } else {
                            userId = req.session.userId;
                            console.log('일반 사용자가 가게 삭제 시도:', { storeId, userId, storeUserId: store.user_id });
                        }
                    }
                } catch (userErr) {
                    console.error('사용자 정보 조회 오류:', userErr);
                    // 사용자 정보 조회 실패 시 일반 사용자로 처리
                }
            } else {
                console.log('비로그인 상태에서 가게 삭제 시도:', { storeId, storeUserId: store.user_id });
            }
        }
        
        // admin이면 userId를 null로 전달하여 모든 가게 삭제 가능 (user_id가 null인 가게 포함)
        // 일반 사용자는 자신의 가게만, 비로그인은 삭제 불가
        await dbModule.deleteStore(db, storeId, isAdmin ? null : userId);
        res.json({ success: true, message: '가게가 삭제되었습니다.' });
    } catch (err) {
        console.error('가게 삭제 오류:', err);
        if (err.message === '가게를 찾을 수 없습니다.') {
            res.status(404).json({ success: false, error: err.message });
        } else {
            res.status(500).json({ success: false, error: err.message });
        }
    }
});

// 네이버 Geocoding API 프록시 (CORS 문제 해결)
app.get('/api/search/naver', async (req, res) => {
    try {
        const query = req.query.query;
        
        console.log('네이버 검색 요청:', query);
        
        if (!query) {
            return res.status(400).json({ success: false, error: '검색어가 필요합니다.' });
        }

        // 먼저 Local Search API 시도 (장소명 검색용)
        const localUrl = `https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(query)}&display=5&sort=random`;
        
        console.log('네이버 Local Search API URL:', localUrl);
        console.log('네이버 API 키:', { clientId: NAVER_CLIENT_ID ? '설정됨' : '없음', clientSecret: NAVER_CLIENT_SECRET ? '설정됨' : '없음' });
        
        const options = {
            headers: {
                'X-Naver-Client-Id': NAVER_CLIENT_ID,
                'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
            }
        };
        
        // Local Search API 호출
        https.get(localUrl, options, (apiRes) => {
            let data = '';
            
            // 에러 응답 처리
            if (apiRes.statusCode !== 200) {
                apiRes.on('data', (chunk) => {
                    data += chunk;
                });
                apiRes.on('end', () => {
                    console.error('네이버 Local Search API 오류 응답:', apiRes.statusCode, data);
                    // Local Search 실패 시 Geocoding API 시도
                    tryGeocodingAPI();
                });
                return;
            }
            
            apiRes.on('data', (chunk) => {
                data += chunk;
            });
            
            apiRes.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    console.log('네이버 Local Search API 응답 상태:', apiRes.statusCode);
                    console.log('네이버 Local Search API items 개수:', jsonData.items ? jsonData.items.length : 0);
                    
                    // Local Search에 결과가 있으면 반환
                    if (jsonData.items && jsonData.items.length > 0) {
                        console.log('네이버 Local Search API 성공');
                        res.json({ success: true, data: jsonData, source: 'local' });
                        return;
                    }
                    
                    // Local Search 결과가 없으면 Geocoding API 시도
                    console.log('네이버 Local Search 결과 없음, Geocoding API 시도');
                    tryGeocodingAPI();
                } catch (parseError) {
                    console.error('네이버 API 응답 파싱 오류:', parseError, data);
                    tryGeocodingAPI();
                }
            });
        }).on('error', (error) => {
            console.error('네이버 Local Search API 호출 오류:', error);
            tryGeocodingAPI();
        });
        
        // Geocoding API 호출 함수 (Local Search 결과가 없을 때 호출)
        function tryGeocodingAPI() {
            // 네이버 Maps Geocoding API는 별도로 제공되지 않으므로
            // Local Search 결과가 없을 때 빈 결과 반환하여 프론트엔드에서 Google/OpenStreetMap으로 폴백
            console.log('네이버 Local Search 결과 없음, 빈 결과 반환 (Google/OpenStreetMap으로 폴백)');
            res.json({ 
                success: true, 
                data: { 
                    items: [],
                    total: 0,
                    display: 0,
                    start: 1,
                    lastBuildDate: new Date().toISOString()
                },
                source: 'local_empty'
            });
        }
    } catch (err) {
        console.error('네이버 검색 API 프록시 오류:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Google Geocoding API는 유료이므로 사용하지 않음
// 무료 대안: 네이버 API + OpenStreetMap 사용

// 서버 시작
app.listen(PORT, '0.0.0.0', () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`로컬 접속: http://localhost:${PORT}`);
});

// 서버 종료 시 데이터베이스 연결 종료
process.on('SIGINT', () => {
    if (db) {
        db.close((err) => {
            if (err) {
                console.error('데이터베이스 연결 종료 오류:', err);
            } else {
                console.log('데이터베이스 연결이 종료되었습니다.');
            }
            process.exit(0);
        });
    }
});

