# 가게 관리 시스템 (Store Management System)

## 📱 기능
- **데이터베이스 기반 가게 관리**: SQLite 데이터베이스에 가게 정보 저장
- **지도 표시**: 등록된 모든 가게를 카카오맵에 마커로 표시
- **가게 CRUD**: 가게 추가, 조회, 수정, 삭제 기능
- **주소 검색**: 주소 입력으로 위치 확인 및 위도/경도 자동 입력
- **모바일 최적화**: 반응형 디자인으로 모바일에서도 사용 가능

## 🚀 설치 및 설정

### 1. Node.js 설치 확인
```bash
node --version
npm --version
```

### 2. 패키지 설치
```bash
cd store
npm install
```

### 3. Kakao Maps API 키 발급

1. [Kakao Developers](https://developers.kakao.com/)에 접속
2. 내 애플리케이션 만들기
3. 앱 설정 > 플랫폼 > Web 플랫폼 등록
   - 사이트 도메인 등록: `http://localhost:3000`
4. 앱 키 > JavaScript 키 복사

### 4. API 키 설정

`store-finder.html` 파일을 열고 다음 라인을 찾아주세요:

```html
<script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=YOUR_KAKAO_APP_KEY&libraries=services"></script>
```

`YOUR_KAKAO_APP_KEY`를 발급받은 JavaScript 키로 변경해주세요.

예시:
```html
<script type="text/javascript" src="//dapi.kakao.com/v2/maps/sdk.js?appkey=1234567890abcdef1234567890abcdef&libraries=services"></script>
```

## 🎯 사용 방법

### 서버 실행

```bash
npm start
```

서버가 `http://localhost:3000`에서 실행됩니다.

### 웹 브라우저 접속

브라우저에서 `http://localhost:3000/store-finder.html` 접속

## 📋 주요 기능

### 1. 가게 추가
- "+ 가게 추가" 버튼 클릭
- 가게 정보 입력:
  - 가게명 (필수)
  - 주소 (필수)
  - 위도/경도 (필수)
  - 전화번호 (선택)
  - 카테고리 (선택)
  - 설명 (선택)
- 주소 검색 기능으로 위도/경도 자동 입력 가능

### 2. 가게 조회
- 페이지 로드 시 데이터베이스의 모든 가게가 지도에 자동 표시
- 하단 가게 목록에서 가게 정보 확인

### 3. 가게 수정
- 가게 목록에서 "수정" 버튼 클릭
- 정보 수정 후 저장

### 4. 가게 삭제
- 가게 목록에서 "삭제" 버튼 클릭
- 확인 후 삭제

### 5. 주소 검색
- 상단 주소 입력란에 주소 입력
- "검색" 버튼 클릭 또는 Enter 키
- 해당 위치로 지도 이동
- 가게 추가 시 위도/경도 자동 입력에 활용

## 🗄️ 데이터베이스 구조

### stores 테이블
| 컬럼명 | 타입 | 설명 |
|--------|------|------|
| id | INTEGER | 고유 ID (자동 증가) |
| name | TEXT | 가게명 |
| address | TEXT | 주소 |
| latitude | REAL | 위도 |
| longitude | REAL | 경도 |
| phone | TEXT | 전화번호 (선택) |
| category | TEXT | 카테고리 (선택) |
| description | TEXT | 설명 (선택) |
| created_at | DATETIME | 생성일시 |
| updated_at | DATETIME | 수정일시 |

## 🔌 API 엔드포인트

### GET /api/stores
모든 가게 조회

**응답 예시:**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "name": "스타벅스 강남점",
      "address": "서울시 강남구 테헤란로",
      "latitude": 37.5665,
      "longitude": 126.9780,
      "phone": "02-1234-5678",
      "category": "카페",
      "description": "24시간 운영",
      "created_at": "2024-01-01 12:00:00",
      "updated_at": "2024-01-01 12:00:00"
    }
  ]
}
```

### GET /api/stores/:id
특정 가게 조회

### POST /api/stores
가게 추가

**요청 예시:**
```json
{
  "name": "스타벅스 강남점",
  "address": "서울시 강남구 테헤란로",
  "latitude": 37.5665,
  "longitude": 126.9780,
  "phone": "02-1234-5678",
  "category": "카페",
  "description": "24시간 운영"
}
```

### PUT /api/stores/:id
가게 수정

### DELETE /api/stores/:id
가게 삭제

## 📁 프로젝트 구조

```
store/
├── server.js              # Express 서버
├── database.js            # SQLite 데이터베이스 모듈
├── store-finder.html      # 프론트엔드 HTML
├── package.json           # Node.js 패키지 설정
├── stores.db              # SQLite 데이터베이스 파일 (자동 생성)
└── STORE_FINDER_README.md # 이 파일
```

## ⚠️ 주의사항

### Kakao Maps API 설정 (중요!)
Kakao Maps API를 사용하려면 **플랫폼 등록**이 필수입니다:

1. [Kakao Developers](https://developers.kakao.com) 접속
2. 내 애플리케이션 선택
3. **플랫폼 설정** → **Web 플랫폼 등록** 클릭
4. **사이트 도메인** 등록:
   - 개발 환경: `http://localhost:3000`
   - 운영 환경: 실제 도메인 (예: `https://yourdomain.com`)
5. **JavaScript 키** 확인 (앱 설정 → 앱 키)
          - 현재 사용 중인 키: `6357c5a889634b07801febf524487150`
   - 키는 `store-finder.html` 파일의 541번째 줄에 설정되어 있습니다
6. 등록 후 **5-10분** 정도 기다린 후 사용

⚠️ **등록하지 않은 도메인에서는 API가 작동하지 않습니다!**

### 기타 주의사항
- Kakao Maps API는 무료로 사용 가능하지만 일일 사용량 제한이 있습니다
- HTTPS 환경에서 사용하는 것을 권장합니다
- 데이터베이스 파일(`stores.db`)은 프로젝트 폴더에 자동 생성됩니다
- 서버를 종료하려면 `Ctrl+C`를 누르세요

## 🐛 문제 해결

### 지도가 표시되지 않을 때
1. **Kakao Maps API 플랫폼 등록 확인** (가장 중요!)
   - [Kakao Developers](https://developers.kakao.com)에서 `http://localhost:3000` 도메인 등록 확인
   - 등록 후 5-10분 정도 기다린 후 다시 시도
2. Kakao Maps API 키가 올바르게 설정되었는지 확인
3. 브라우저 콘솔에서 오류 메시지 확인
   - "Kakao Maps API가 로드되지 않음" 오류가 나오면 플랫폼 등록 확인
   - "403 Forbidden" 오류는 플랫폼 미등록 또는 도메인 불일치
4. 서버가 실행 중인지 확인

### 가게가 표시되지 않을 때
1. 서버가 실행 중인지 확인 (`npm start`)
2. 브라우저 콘솔에서 API 오류 확인
3. 데이터베이스 파일이 생성되었는지 확인

### 서버 연결 오류
1. 서버가 실행 중인지 확인
2. 포트 3000이 사용 중인지 확인
3. 방화벽 설정 확인

## 📱 모바일 최적화

- 터치 제스처 지원
- 반응형 디자인
- 모바일 화면에 최적화된 UI
- 모달 및 목록 스크롤 최적화

## 🔧 개발 팁

### 데이터베이스 직접 접근
SQLite 데이터베이스 파일(`stores.db`)을 SQLite 브라우저나 CLI로 직접 확인할 수 있습니다.

```bash
# SQLite CLI 설치 후
sqlite3 stores.db
SELECT * FROM stores;
```

### 포트 변경
`server.js` 파일에서 `PORT` 변수를 수정하면 다른 포트로 실행할 수 있습니다.

```javascript
const PORT = 3000; // 원하는 포트 번호로 변경
```

## 📝 라이선스

MIT License
