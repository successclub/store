# HTTP vs HTTPS 가이드

## HTTP와 HTTPS의 차이

### HTTP (HyperText Transfer Protocol)
- **보안**: 암호화되지 않음
- **포트**: 80
- **특징**: 데이터가 평문으로 전송됨 (도청 가능)
- **용도**: 로컬 개발, 내부 네트워크

### HTTPS (HyperText Transfer Protocol Secure)
- **보안**: SSL/TLS 암호화
- **포트**: 443
- **특징**: 데이터가 암호화되어 전송됨 (보안)
- **용도**: 프로덕션 환경, 실제 서비스

## 현재 프로젝트 상태

### 로컬 개발 환경
- **현재**: HTTP만 사용 (`http://localhost:3000`)
- **이유**: 로컬 개발에는 충분함
- **세션 쿠키**: `secure: false` (HTTP에서 작동)

### 프로덕션 환경 (호스팅)
- **필요**: HTTPS 사용 필수
- **이유**: 
  - 사용자 데이터 보호 (비밀번호, 세션 등)
  - 브라우저 보안 정책
  - 검색 엔진 SEO
- **세션 쿠키**: `secure: true` (HTTPS에서만 작동)

## 호스팅 서비스에서 HTTPS 설정

### 대부분의 호스팅 서비스는 자동으로 HTTPS 제공

#### 1. **Railway, Render, Heroku 등**
- 자동으로 SSL 인증서 제공
- 도메인 연결 시 자동 HTTPS 활성화
- 별도 설정 불필요

#### 2. **직접 설정이 필요한 경우**
- Let's Encrypt 무료 SSL 인증서 사용
- 호스팅 서비스의 SSL 설정 메뉴에서 활성화

## 현재 코드의 HTTPS 준비 상태

### ✅ 이미 준비됨
```javascript
// server.js
cookie: { 
    secure: process.env.NODE_ENV === 'production', // 프로덕션에서 자동 HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
}
```

**동작 방식:**
- 로컬 개발 (`NODE_ENV !== 'production'`): `secure: false` → HTTP에서 작동
- 프로덕션 (`NODE_ENV=production`): `secure: true` → HTTPS에서만 작동

## 로컬에서 HTTPS 테스트하기 (선택사항)

로컬에서 HTTPS를 테스트하고 싶다면:

### 1. 자체 서명 인증서 생성 (테스트용)

```bash
# OpenSSL 설치 필요 (Windows: Git Bash 또는 WSL 사용)
openssl req -x509 -newkey rsa:4096 -nodes -keyout key.pem -out cert.pem -days 365
```

### 2. server.js에 HTTPS 서버 추가 (선택사항)

```javascript
// HTTPS 서버 (로컬 테스트용)
if (process.env.USE_HTTPS === 'true') {
    const https = require('https');
    const fs = require('fs');
    
    const options = {
        key: fs.readFileSync('key.pem'),
        cert: fs.readFileSync('cert.pem')
    };
    
    https.createServer(options, app).listen(3443, () => {
        console.log(`HTTPS 서버가 https://localhost:3443 에서 실행 중입니다.`);
    });
} else {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    });
}
```

**주의**: 자체 서명 인증서는 브라우저에서 경고가 나타납니다. 테스트용으로만 사용하세요.

## 배포 시 HTTPS 체크리스트

### ✅ 필수 확인 사항

1. **환경 변수 설정**
   ```
   NODE_ENV=production
   ```

2. **호스팅 서비스에서 SSL 활성화**
   - 대부분 자동으로 제공됨
   - 도메인 연결 시 자동 활성화

3. **세션 쿠키 설정 확인**
   - 프로덕션에서 `secure: true` 자동 적용됨

4. **브라우저에서 HTTPS 확인**
   - 주소창에 🔒 자물쇠 아이콘 표시
   - `https://`로 시작하는 URL

## 보안 권장사항

### 프로덕션 환경에서 필수

1. **HTTPS 사용** ✅ (현재 코드에 준비됨)
2. **세션 시크릿 변경** ✅ (환경 변수로 설정)
3. **환경 변수 보호** ✅ (.env 파일 보호)
4. **CORS 설정** ✅ (현재 설정됨)

## 문제 해결

### "세션 쿠키가 작동하지 않아요"
- **원인**: HTTPS가 아닌 환경에서 `secure: true` 사용
- **해결**: 
  - 로컬: `NODE_ENV`를 설정하지 않음 (기본값: development)
  - 프로덕션: HTTPS 사용 확인

### "브라우저에서 경고가 나타나요"
- **원인**: 자체 서명 인증서 사용 (로컬 테스트)
- **해결**: 프로덕션에서는 호스팅 서비스의 SSL 인증서 사용

## 요약

### 현재 상태
- ✅ 로컬: HTTP 사용 (정상)
- ✅ 프로덕션: HTTPS 자동 준비됨
- ✅ 세션 쿠키: 환경에 따라 자동 설정

### 배포 시
1. 호스팅 서비스 선택 (대부분 자동 HTTPS 제공)
2. `NODE_ENV=production` 설정
3. 도메인 연결 (자동으로 HTTPS 활성화)
4. 완료! 🎉

---

**결론**: 현재 코드는 이미 HTTPS를 지원하도록 준비되어 있습니다. 호스팅 서비스에 배포하면 자동으로 HTTPS가 활성화됩니다.

