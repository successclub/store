# 배포 가이드

## AsuraHosting Node.js 호스팅 배포

### 1. 필수 환경 변수 설정

호스팅 서비스의 환경 변수 설정에서 다음 변수들을 추가하세요:

```
PORT=3000
NODE_ENV=production
SESSION_SECRET=your-very-secure-random-secret-key-here

# 이메일 설정 (Gmail)
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

**중요**: 
- `SESSION_SECRET`은 랜덤한 긴 문자열로 설정하세요 (최소 32자 이상)
- `EMAIL_PASS`는 Gmail 앱 비밀번호입니다 (공백 없이 입력)

### 2. 파일 업로드

다음 파일들을 호스팅 서비스에 업로드하세요:

**필수 파일:**
- `server.js` - 서버 메인 파일
- `database.js` - 데이터베이스 모듈
- `package.json` - 의존성 정의
- `package-lock.json` - 의존성 잠금 파일
- `index.html` - 메인 페이지
- `admin.html` - 관리자 페이지
- `stores.db` - SQLite 데이터베이스 파일 (초기에는 빈 파일로 시작 가능)

**선택 파일:**
- `sample.html`, `test.html`, `store-finder.html` 등 (필요한 경우)

### 3. 의존성 설치

호스팅 서비스의 터미널에서 다음 명령어를 실행하세요:

```bash
npm install
```

### 4. 데이터베이스 초기화

데이터베이스 파일(`stores.db`)이 없는 경우, 서버를 처음 실행하면 자동으로 생성됩니다.

### 5. 서버 시작

호스팅 서비스에서 Node.js 앱을 시작하세요. 일반적으로:
- 시작 명령어: `npm start` 또는 `node server.js`
- 포트: 환경 변수 `PORT`에 설정된 값 사용 (기본값: 3000)

### 6. 확인 사항

배포 후 다음을 확인하세요:

1. **서버 실행 확인**
   - 호스팅 서비스의 로그에서 "서버가 포트 XXXX에서 실행 중입니다." 메시지 확인

2. **정적 파일 제공**
   - `http://your-domain.com/index.html` 접속 테스트
   - `http://your-domain.com/admin.html` 접속 테스트

3. **API 엔드포인트**
   - 회원가입, 로그인 기능 테스트
   - 가게 등록/조회 기능 테스트

4. **이메일 기능**
   - 비밀번호 찾기 기능 테스트
   - Gmail 앱 비밀번호가 올바르게 설정되었는지 확인

### 7. 보안 설정

**프로덕션 환경에서 필수:**

1. **세션 시크릿 변경**
   ```
   SESSION_SECRET=랜덤한-긴-문자열-최소-32자-이상
   ```

2. **HTTPS 사용**
   - 호스팅 서비스에서 SSL 인증서 설정
   - `NODE_ENV=production` 설정 시 자동으로 `secure: true` 적용

3. **환경 변수 보호**
   - `.env` 파일은 절대 Git에 커밋하지 마세요
   - 호스팅 서비스의 환경 변수 설정 기능 사용

### 8. 문제 해결

**포트 오류:**
- 호스팅 서비스에서 제공하는 포트 번호를 `PORT` 환경 변수에 설정

**데이터베이스 오류:**
- `stores.db` 파일의 쓰기 권한 확인
- SQLite3 모듈이 올바르게 설치되었는지 확인

**이메일 전송 실패:**
- Gmail 앱 비밀번호가 올바른지 확인
- `EMAIL_USER`와 `EMAIL_PASS` 환경 변수 확인
- 호스팅 서비스의 방화벽에서 SMTP 포트(587) 허용 확인

### 9. 백업

정기적으로 다음을 백업하세요:
- `stores.db` - 데이터베이스 파일
- 환경 변수 설정 값

### 10. 업데이트

코드 업데이트 시:
1. 변경된 파일 업로드
2. `package.json`이 변경된 경우: `npm install` 실행
3. 서버 재시작

---

**참고**: AsuraHosting의 구체적인 배포 방법은 해당 서비스의 문서를 참조하세요.

