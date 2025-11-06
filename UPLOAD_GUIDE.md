# picenter.kr 파일 업로드 가이드

## 업로드할 파일 목록

1. **index.html** - 메인 페이지
2. **server.js** - Node.js 서버
3. **database.js** - 데이터베이스 모듈
4. **package.json** - 의존성 관리
5. **stores.db** - 데이터베이스 파일 (없으면 자동 생성)

## 업로드 방법

### 방법 1: hosting.kr 파일 매니저
1. hosting.kr 관리자 페이지 접속
2. "파일 매니저" 또는 "FTP 관리" 메뉴 클릭
3. `public_html` 또는 `www` 폴더로 이동
4. 파일 업로드

### 방법 2: FTP 클라이언트
1. FileZilla 다운로드 및 설치
2. 호스팅 제공 FTP 정보 입력:
   - 호스트: ftp.picenter.kr (또는 제공된 주소)
   - 포트: 21
   - 사용자명/비밀번호: 호스팅 계정 정보
3. `public_html` 또는 `www` 폴더로 이동
4. 파일 드래그 앤 드롭

## 중요: Node.js 지원 확인 필요

현재 프로젝트는 **Node.js + Express** 서버가 필요합니다.

hosting.kr에서 Node.js를 지원하지 않으면:
- VPS/클라우드 호스팅 사용 (DigitalOcean, Vultr 등)
- Node.js 전용 호스팅 사용 (Railway, Render 등)

## 서버 실행 방법 (SSH 접속 후)

```bash
cd public_html  # 또는 www 폴더
npm install
node server.js
```

또는 PM2 사용:
```bash
npm install -g pm2
pm2 start server.js
pm2 save
pm2 startup
```

## admin 계정

- 아이디: admin
- 비밀번호: 123456 (서버 시작 시 자동 생성)

## API 엔드포인트

- 회원가입: POST /api/auth/register
- 로그인: POST /api/auth/login
- 로그아웃: POST /api/auth/logout
- 가게 조회: GET /api/stores
- 가게 추가: POST /api/stores
- 가게 수정: PUT /api/stores/:id
- 가게 삭제: DELETE /api/stores/:id









