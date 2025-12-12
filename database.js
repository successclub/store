const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// DB 경로를 환경변수로 지정 가능하게 하고, 기본값은 프로젝트 내부 data 폴더로 고정
// - Railway 등 배포 환경에서는 이 경로를 퍼시스턴트 볼륨에 마운트하여 데이터 초기화를 방지
const defaultDbDir = process.env.DATABASE_DIR || path.join(__dirname, 'data');
const dbPath = process.env.DATABASE_PATH || path.join(defaultDbDir, 'stores.db');

// DB 디렉터리가 없으면 생성 (이미 존재하면 패스)
if (!fs.existsSync(defaultDbDir)) {
    fs.mkdirSync(defaultDbDir, { recursive: true });
    console.log(`데이터베이스 디렉터리를 생성했습니다: ${defaultDbDir}`);
}

// 데이터베이스 초기화 및 연결
function initDatabase() {
    return new Promise((resolve, reject) => {
        const db = new sqlite3.Database(dbPath, (err) => {
            if (err) {
                console.error('데이터베이스 연결 오류:', err);
                reject(err);
            } else {
                console.log('SQLite 데이터베이스에 연결되었습니다.');
            }
        });

        // users 테이블 생성
        db.serialize(() => {
            // users 테이블 생성
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('users 테이블 생성 오류:', err);
                    reject(err);
                    return;
                }
                console.log('users 테이블이 준비되었습니다.');
                
                // users 테이블에 email 컬럼 추가 (마이그레이션)
                db.run(`ALTER TABLE users ADD COLUMN email TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('email 컬럼 추가 오류:', err);
                    }
                });
                // users 테이블에 is_temp_password 컬럼 추가 (마이그레이션)
                db.run(`ALTER TABLE users ADD COLUMN is_temp_password INTEGER DEFAULT 0`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('is_temp_password 컬럼 추가 오류:', err);
                    }
                });
                // users 테이블에 name 컬럼 추가 (마이그레이션)
                db.run(`ALTER TABLE users ADD COLUMN name TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('name 컬럼 추가 오류:', err);
                    }
                });
            });

            // 가게 테이블 생성
            db.run(`
                CREATE TABLE IF NOT EXISTS stores (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    name TEXT NOT NULL,
                    address TEXT NOT NULL,
                    road_address TEXT,
                    lot_address TEXT,
                    latitude REAL NOT NULL,
                    longitude REAL NOT NULL,
                    phone TEXT,
                    category TEXT,
                    description TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id)
                )
            `, (err) => {
                if (err) {
                    console.error('stores 테이블 생성 오류:', err);
                    reject(err);
                    return;
                }
                
                // 기존 테이블에 새 컬럼 추가 (마이그레이션)
                db.run(`ALTER TABLE stores ADD COLUMN road_address TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('road_address 컬럼 추가 오류:', err);
                    }
                });
                db.run(`ALTER TABLE stores ADD COLUMN lot_address TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('lot_address 컬럼 추가 오류:', err);
                    }
                });
                db.run(`ALTER TABLE stores ADD COLUMN user_id INTEGER`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('user_id 컬럼 추가 오류:', err);
                    }
                });
                db.run(`ALTER TABLE stores ADD COLUMN email TEXT`, (err) => {
                    if (err && !err.message.includes('duplicate column name')) {
                        console.error('email 컬럼 추가 오류:', err);
                    }
                });
                
                console.log('stores 테이블이 준비되었습니다.');
                resolve(db);
            });
        });
    });
}

// 모든 가게 조회 (user_id 필터링 가능, 사용자 정보 포함)
function getAllStores(db, userId = null) {
    return new Promise((resolve, reject) => {
        let sql = `
            SELECT 
                stores.*,
                users.username as user_username,
                users.name as user_name,
                users.email as user_email
            FROM stores
            LEFT JOIN users ON stores.user_id = users.id
        `;
        let params = [];
        
        if (userId !== null) {
            sql += ' WHERE stores.user_id = ?';
            params.push(userId);
        }
        
        sql += ' ORDER BY stores.created_at DESC';
        
        db.all(sql, params, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// 가게 추가
function addStore(db, storeData) {
    return new Promise((resolve, reject) => {
        const { user_id, name, address, road_address, lot_address, latitude, longitude, phone, email, category, description } = storeData;
        const sql = `
            INSERT INTO stores (user_id, name, address, road_address, lot_address, latitude, longitude, phone, email, category, description)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        db.run(sql, [
            user_id || null,
            name, 
            address, 
            road_address || null, 
            lot_address || null, 
            latitude, 
            longitude, 
            phone || null, 
            email || null,
            category || null, 
            description || null
        ], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve({ id: this.lastID, ...storeData });
            }
        });
    });
}

// 가게 수정 (user_id 체크 포함)
function updateStore(db, id, storeData, userId = null) {
    return new Promise((resolve, reject) => {
        const { name, address, road_address, lot_address, latitude, longitude, phone, email, category, description } = storeData;
        let sql = `
            UPDATE stores 
            SET name = ?, address = ?, road_address = ?, lot_address = ?, latitude = ?, longitude = ?, 
                phone = ?, email = ?, category = ?, description = ?, 
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `;
        let params = [
            name, 
            address, 
            road_address || null, 
            lot_address || null, 
            latitude, 
            longitude, 
            phone || null, 
            email || null,
            category || null, 
            description || null, 
            id
        ];
        
        // user_id가 제공되면 해당 사용자의 가게만 수정 가능
        if (userId !== null) {
            sql = sql.replace('WHERE id = ?', 'WHERE id = ? AND user_id = ?');
            params.push(userId);
        }
        
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                if (this.changes === 0) {
                    reject(new Error('가게를 찾을 수 없습니다.'));
                } else {
                    resolve({ id, ...storeData });
                }
            }
        });
    });
}

// 가게 삭제 (user_id 체크 포함)
function deleteStore(db, id, userId = null) {
    return new Promise((resolve, reject) => {
        let sql = 'DELETE FROM stores WHERE id = ?';
        let params = [id];
        
        // user_id가 제공되면 해당 사용자의 가게만 삭제 가능
        // userId가 null이면 admin 권한으로 모든 가게 삭제 가능 (user_id가 null인 가게 포함)
        if (userId !== null) {
            sql = 'DELETE FROM stores WHERE id = ? AND user_id = ?';
            params.push(userId);
        }
        // userId가 null이면 user_id 체크 없이 삭제 (admin 권한)
        
        db.run(sql, params, function(err) {
            if (err) {
                reject(err);
            } else {
                if (this.changes === 0) {
                    reject(new Error('가게를 찾을 수 없습니다.'));
                } else {
                    resolve({ id });
                }
            }
        });
    });
}

// ID로 가게 조회 (사용자 정보 포함)
function getStoreById(db, id) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT 
                stores.*,
                users.username as user_username,
                users.name as user_name,
                users.email as user_email
            FROM stores
            LEFT JOIN users ON stores.user_id = users.id
            WHERE stores.id = ?
        `;
        db.get(sql, [id], (err, row) => {
            if (err) {
                console.error('getStoreById 오류:', err);
                reject(err);
            } else if (!row) {
                reject(new Error('가게를 찾을 수 없습니다.'));
            } else {
                console.log('getStoreById 결과:', {
                    id: row.id,
                    name: row.name,
                    user_id: row.user_id,
                    user_username: row.user_username,
                    user_name: row.user_name
                });
                resolve(row);
            }
        });
    });
}

// 사용자 추가
function addUser(db, username, passwordHash, email = null, name = null) {
    return new Promise((resolve, reject) => {
        const sql = 'INSERT INTO users (username, password, email, name) VALUES (?, ?, ?, ?)';
        db.run(sql, [username, passwordHash, email, name], function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    reject(new Error('이미 사용 중인 아이디입니다.'));
                } else {
                    reject(err);
                }
            } else {
                resolve({ id: this.lastID, username, email, name });
            }
        });
    });
}

// 사용자명으로 사용자 조회
function getUserByUsername(db, username) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// 사용자 ID로 사용자 조회
function getUserById(db, id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT id, username, created_at FROM users WHERE id = ?', [id], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// 사용자 비밀번호 업데이트
function updateUserPassword(db, id, passwordHash, isTempPassword = false) {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE users SET password = ?, is_temp_password = ? WHERE id = ?';
        db.run(sql, [passwordHash, isTempPassword ? 1 : 0, id], function(err) {
            if (err) {
                reject(err);
            } else {
                if (this.changes === 0) {
                    reject(new Error('사용자를 찾을 수 없습니다.'));
                } else {
                    resolve({ id });
                }
            }
        });
    });
}

// 이메일로 사용자 조회
function getUserByEmail(db, email) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
            if (err) {
                reject(err);
            } else {
                resolve(row);
            }
        });
    });
}

// 사용자 이메일 업데이트
function updateUserEmail(db, id, email) {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE users SET email = ? WHERE id = ?';
        db.run(sql, [email || null, id], function(err) {
            if (err) {
                reject(err);
            } else {
                if (this.changes === 0) {
                    reject(new Error('사용자를 찾을 수 없습니다.'));
                } else {
                    resolve({ id, email });
                }
            }
        });
    });
}

// 사용자 이름 업데이트
function updateUserName(db, id, name) {
    return new Promise((resolve, reject) => {
        const sql = 'UPDATE users SET name = ? WHERE id = ?';
        db.run(sql, [name || null, id], function(err) {
            if (err) {
                reject(err);
            } else {
                if (this.changes === 0) {
                    reject(new Error('사용자를 찾을 수 없습니다.'));
                } else {
                    resolve({ id, name });
                }
            }
        });
    });
}

// 사용자 삭제 (관련 가게도 함께 삭제)
function deleteUser(db, userId) {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // 트랜잭션 시작
            db.run('BEGIN TRANSACTION', (err) => {
                if (err) {
                    console.error('트랜잭션 시작 오류:', err);
                    reject(err);
                    return;
                }
                
                // 먼저 관련 가게 삭제
                db.run('DELETE FROM stores WHERE user_id = ?', [userId], (storeErr) => {
                    if (storeErr) {
                        console.error('가게 삭제 오류:', storeErr);
                        db.run('ROLLBACK', () => {
                            reject(new Error(`가게 삭제 오류: ${storeErr.message}`));
                        });
                        return;
                    }
                    
                    // 사용자 삭제
                    db.run('DELETE FROM users WHERE id = ?', [userId], function(userErr) {
                        if (userErr) {
                            console.error('사용자 삭제 오류:', userErr);
                            db.run('ROLLBACK', () => {
                                reject(new Error(`사용자 삭제 오류: ${userErr.message}`));
                            });
                            return;
                        }
                        
                        if (this.changes === 0) {
                            db.run('ROLLBACK', () => {
                                reject(new Error('사용자를 찾을 수 없습니다.'));
                            });
                            return;
                        }
                        
                        // 커밋
                        db.run('COMMIT', (commitErr) => {
                            if (commitErr) {
                                console.error('커밋 오류:', commitErr);
                                reject(new Error(`커밋 오류: ${commitErr.message}`));
                            } else {
                                resolve({ id: userId, deleted: true });
                            }
                        });
                    });
                });
            });
        });
    });
}

// 모든 사용자 조회 (가게 정보 포함)
function getAllUsers(db) {
    return new Promise((resolve, reject) => {
        // 먼저 모든 사용자 조회
        const usersSql = `
            SELECT 
                id,
                username,
                name,
                email,
                created_at,
                COALESCE(is_temp_password, 0) as is_temp_password
            FROM users
            ORDER BY created_at DESC
        `;
        
        db.all(usersSql, [], (err, users) => {
            if (err) {
                console.error('getAllUsers - 사용자 조회 오류:', err);
                reject(new Error(`데이터베이스 조회 오류: ${err.message}`));
                return;
            }
            
            if (!users || users.length === 0) {
                resolve([]);
                return;
            }
            
            // 각 사용자의 가게 정보 조회
            const userIds = users.map(u => u.id);
            const placeholders = userIds.map(() => '?').join(',');
            
            const storesSql = `
                SELECT 
                    user_id,
                    COUNT(*) as store_count,
                    GROUP_CONCAT(name, ', ') as store_names
                FROM stores
                WHERE user_id IN (${placeholders})
                GROUP BY user_id
            `;
            
            db.all(storesSql, userIds, (storeErr, storeData) => {
                if (storeErr) {
                    console.error('getAllUsers - 가게 정보 조회 오류:', storeErr);
                    // 가게 정보 조회 실패해도 사용자 정보는 반환
                }
                
                // 가게 정보를 맵으로 변환
                const storeMap = {};
                if (storeData) {
                    storeData.forEach(store => {
                        storeMap[store.user_id] = {
                            count: parseInt(store.store_count) || 0,
                            names: store.store_names && store.store_names.trim()
                                ? store.store_names.split(', ').filter(name => name.trim())
                                : []
                        };
                    });
                }
                
                // 결과 조합
                try {
                    const result = users.map(user => ({
                        id: user.id,
                        username: user.username || '',
                        name: user.name || null,
                        email: user.email || null,
                        created_at: user.created_at,
                        is_temp_password: user.is_temp_password || 0,
                        store_count: storeMap[user.id] ? storeMap[user.id].count : 0,
                        store_names: storeMap[user.id] ? storeMap[user.id].names : []
                    }));
                    
                    resolve(result);
                } catch (parseError) {
                    console.error('getAllUsers 데이터 파싱 오류:', parseError);
                    reject(new Error(`데이터 파싱 오류: ${parseError.message}`));
                }
            });
        });
    });
}

module.exports = {
    initDatabase,
    getAllStores,
    addStore,
    updateStore,
    deleteStore,
    getStoreById,
    addUser,
    getUserByUsername,
    getUserById,
    getUserByEmail,
    updateUserPassword,
    updateUserEmail,
    updateUserName,
    getAllUsers,
    deleteUser,
    dbPath
};

