# Railway 배포 가이드

## Railway란?
- 간단하고 빠른 배포 플랫폼
- Git 연동으로 자동 배포
- 무료 티어 제공 (제한적)
- SQLite3 지원
- 자동 HTTPS 제공

## 가격
- **무료 티어**: $5 크레딧/월 (제한적)
- **Hobby 플랜**: $5/월 (추천)
- **Pro 플랜**: $20/월

## 배포 전 준비

### 1. Railway 계정 생성
1. https://railway.app 접속
2. "Start a New Project" 클릭
3. GitHub 계정으로 로그인 (권장) 또는 이메일로 가입

### 2. 프로젝트 파일 확인
다음 파일들이 있는지 확인:
- ✅ `server.js`
- ✅ `database.js`
- ✅ `package.json`
- ✅ `package-lock.json`
- ✅ `index.html`
- ✅ `admin.html`
- ✅ `stores.db` (선택사항, 없으면 자동 생성)

## 배포 방법

### 방법 1: GitHub 연동 (추천) ⭐

#### 1단계: GitHub 저장소 생성
```bash
# Git 초기화 (아직 안 했다면)
git init
git add .
git commit -m "Initial commit"

# GitHub에 새 저장소 생성 후
git remote add origin https://github.com/your-username/your-repo.git
git push -u origin main
```

#### 2단계: Railway에서 프로젝트 연결
1. Railway 대시보드에서 "New Project" 클릭
2. "Deploy from GitHub repo" 선택
3. GitHub 저장소 선택
4. 자동으로 배포 시작

#### 3단계: 환경 변수 설정
Railway 대시보드 → 프로젝트 → Variables 탭에서 추가:

```
NODE_ENV=production
SESSION_SECRET=your-very-secure-random-secret-key-min-32-chars
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password-16-digits
```

**중요**: 
- `SESSION_SECRET`은 랜덤한 긴 문자열 (최소 32자)
- `EMAIL_PASS`는 Gmail 앱 비밀번호 (공백 없이)

#### 4단계: 포트 설정
Railway는 자동으로 `PORT` 환경 변수를 설정하므로 별도 설정 불필요!

### 방법 2: 직접 업로드

#### 1단계: Railway CLI 설치
```bash
npm install -g @railway/cli
```

#### 2단계: 로그인
```bash
railway login
```

#### 3단계: 프로젝트 초기화
```bash
railway init
```

#### 4단계: 환경 변수 설정
```bash
railway variables set NODE_ENV=production
railway variables set SESSION_SECRET=your-secret-key
railway variables set EMAIL_USER=your-email@gmail.com
railway variables set EMAIL_PASS=your-app-password
```

#### 5단계: 배포
```bash
railway up
```

## 환경 변수 설정 상세

### 필수 환경 변수

| 변수명 | 설명 | 예시 |
|--------|------|------|
| `NODE_ENV` | 프로덕션 환경 | `production` |
| `SESSION_SECRET` | 세션 암호화 키 | `랜덤한-긴-문자열-32자-이상` |
| `EMAIL_USER` | Gmail 주소 | `your-email@gmail.com` |
| `EMAIL_PASS` | Gmail 앱 비밀번호 | `abcdefghijklmnop` (16자리) |

### 자동 설정되는 변수
- `PORT` - Railway가 자동으로 설정 (변경 불필요)

## 배포 후 확인

### 1. 서버 로그 확인
Railway 대시보드 → 프로젝트 → Deployments → 로그 확인
- "서버가 포트 XXXX에서 실행 중입니다." 메시지 확인

### 2. 도메인 확인
Railway 대시보드 → 프로젝트 → Settings → Domains
- 자동 생성된 도메인 확인 (예: `your-project.railway.app`)
- HTTPS 자동 활성화됨

### 3. 기능 테스트
1. **메인 페이지**: `https://your-project.railway.app/index.html`
2. **관리자 페이지**: `https://your-project.railway.app/admin.html`
3. **회원가입/로그인**: 정상 작동 확인
4. **비밀번호 찾기**: 이메일 전송 확인

## 커스텀 도메인 설정 (선택사항)

### 1. 도메인 추가
Railway 대시보드 → 프로젝트 → Settings → Domains → "Custom Domain" 클릭

### 2. DNS 설정
도메인 제공업체에서 다음 DNS 레코드 추가:
- **Type**: CNAME
- **Name**: @ 또는 www
- **Value**: `your-project.railway.app`

### 3. SSL 인증서
Railway가 자동으로 SSL 인증서를 발급하고 HTTPS를 활성화합니다.

## 문제 해결

### 문제 1: 배포 실패
**원인**: 의존성 설치 실패
**해결**:
```bash
# 로컬에서 테스트
npm install
npm start
```

### 문제 2: SQLite3 오류
**원인**: 네이티브 모듈 컴파일 실패
**해결**: Railway는 SQLite3를 자동으로 지원합니다. 문제가 있으면 로그 확인

### 문제 3: 포트 오류
**원인**: 포트 설정 문제
**해결**: Railway가 자동으로 `PORT` 환경 변수를 설정하므로 코드에서 `process.env.PORT` 사용 확인

### 문제 4: 세션 쿠키 작동 안 함
**원인**: HTTPS 설정 문제
**해결**: 
- `NODE_ENV=production` 설정 확인
- Railway는 자동으로 HTTPS 제공

### 문제 5: 이메일 전송 실패
**원인**: Gmail 앱 비밀번호 문제
**해결**:
1. Google 계정 → 보안 → 2단계 인증 활성화
2. 앱 비밀번호 생성: https://myaccount.google.com/apppasswords
3. Railway 환경 변수에 올바른 값 설정

## 데이터베이스 백업

### Railway에서 데이터베이스 다운로드
1. Railway 대시보드 → 프로젝트 → Data 탭
2. `stores.db` 파일 다운로드

### 또는 Railway CLI 사용
```bash
railway run cat stores.db > stores-backup.db
```

## 업데이트 배포

### GitHub 연동 시
```bash
git add .
git commit -m "Update description"
git push
```
Railway가 자동으로 배포합니다!

### CLI 사용 시
```bash
railway up
```

## 비용 관리

### 무료 티어 제한
- $5 크레딧/월
- 제한된 사용량

### Hobby 플랜 ($5/월)
- 충분한 리소스
- 무제한 배포
- 커스텀 도메인

### 사용량 모니터링
Railway 대시보드 → 프로젝트 → Usage 탭에서 확인

## 보안 체크리스트

- ✅ `NODE_ENV=production` 설정
- ✅ `SESSION_SECRET` 랜덤 문자열로 설정
- ✅ 환경 변수에 민감한 정보 저장 (코드에 하드코딩 X)
- ✅ HTTPS 자동 활성화 (Railway 제공)
- ✅ 세션 쿠키 `secure: true` (프로덕션에서 자동)

## 유용한 명령어

```bash
# Railway CLI 로그인
railway login

# 프로젝트 목록
railway list

# 현재 프로젝트 로그 보기
railway logs

# 환경 변수 확인
railway variables

# 환경 변수 설정
railway variables set KEY=value

# 서버 재시작
railway restart
```

## 다음 단계

1. ✅ Railway 계정 생성
2. ✅ GitHub 저장소 생성 및 연결
3. ✅ 환경 변수 설정
4. ✅ 배포 확인
5. ✅ 기능 테스트
6. ✅ 커스텀 도메인 설정 (선택사항)

---

**참고**: Railway는 매우 사용하기 쉬운 플랫폼입니다. 문제가 발생하면 Railway 대시보드의 로그를 확인하세요!

**도움말**: https://docs.railway.app

