# picenter.kr 서버 설정 가이드

## 1. SSH 접속 (필요한 경우)

hosting.kr에서 SSH 접속 정보 확인:
- SSH 호스트: (hosting.kr에서 제공)
- SSH 포트: 22
- 사용자명/비밀번호: 호스팅 계정 정보

## 2. 서버 디렉토리로 이동

```bash
cd public_html
# 또는
cd www
```

## 3. Node.js 설치 확인

```bash
node --version
npm --version
```

Node.js가 없으면 hosting.kr 고객센터에 문의하거나, VPS로 전환 필요

## 4. 의존성 설치

```bash
npm install
```

## 5. 서버 실행

### 방법 1: 직접 실행 (터미널 종료 시 중단됨)
```bash
node server.js
```

### 방법 2: PM2로 백그라운드 실행 (권장)
```bash
npm install -g pm2
pm2 start server.js
pm2 save
pm2 startup
```

## 6. 서버 확인

브라우저에서 접속:
- http://picenter.kr
- 또는 https://picenter.kr

## 7. 포트 설정 (필요한 경우)

hosting.kr에서 포트 3000을 사용할 수 없다면:
- 환경 변수로 PORT 설정
- 또는 server.js에서 PORT 변경

## 8. admin 계정

- 아이디: admin
- 비밀번호: 123456

## 문제 해결

### Node.js가 설치되어 있지 않은 경우
- hosting.kr 고객센터에 Node.js 지원 요청
- 또는 VPS/클라우드 호스팅으로 전환

### 포트 3000을 사용할 수 없는 경우
- server.js의 PORT 변수 수정
- hosting.kr에서 제공하는 포트 사용









