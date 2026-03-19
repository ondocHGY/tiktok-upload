# TikTok Upload Scheduler

TikTok 동영상 예약 업로드를 위한 풀스택 애플리케이션.
TikTok OAuth2 계정 연동, 동영상 예약 업로드, 상태 추적 기능 제공.

## Tech Stack

- **Backend**: Python 3.11 / FastAPI / SQLAlchemy 2.0 (async) / APScheduler
- **Frontend**: React 19 / TypeScript / Ant Design 6 / Axios
- **Database**: MySQL 8.0 (aiomysql)
- **Infra**: Docker Compose (db, backend, frontend+nginx)

## Project Structure

```
├── main.py                    # FastAPI 엔트리포인트 (lifespan으로 DB/스케줄러 초기화)
├── config.py                  # Pydantic Settings (.env 로드)
├── database.py                # SQLAlchemy async 엔진/세션
├── models.py                  # ORM: TikTokAccount, ScheduledUpload
├── schemas.py                 # Pydantic 요청/응답 스키마
├── routers/
│   ├── auth.py                # OAuth2 PKCE 인증 엔드포인트
│   └── schedules.py           # 예약 CRUD + 비디오 파일 관리
├── services/
│   ├── scheduler.py           # APScheduler 작업 관리
│   ├── tiktok_auth.py         # 토큰 교환/갱신
│   └── tiktok_upload.py       # TikTok API 업로드 (청크 전송)
├── videos/                    # 업로드할 비디오 파일 저장소
├── frontend/
│   ├── src/
│   │   ├── App.tsx            # 라우팅 (/, /schedules/new, /accounts)
│   │   ├── api/client.ts      # Axios 클라이언트
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx  # 예약 목록 (탭: 전체/대기/업로드중/완료/실패)
│   │   │   ├── ScheduleForm.tsx # 예약 생성/수정 폼
│   │   │   └── Accounts.tsx   # 계정 관리
│   │   └── components/        # Layout, StatusBadge
│   ├── package.json
│   └── nginx.conf
├── docker-compose.yml         # db(:3307), backend(:8010), frontend(:3010)
├── .env.example               # 환경변수 템플릿
└── requirements.txt
```

## How to Run

### Docker (권장)
```bash
cp .env.example .env   # TikTok API 키 등 설정
docker-compose up --build
# Frontend: http://localhost:3010  |  API: http://localhost:8010
```

### 로컬 개발
```bash
# Backend
pip install -r requirements.txt
python main.py  # http://localhost:8000

# Frontend
cd frontend && npm install && npm start  # http://localhost:3000
```

## Key API Endpoints

- `GET /auth/login` — TikTok OAuth 시작
- `GET /auth/callback` — OAuth 콜백
- `GET /auth/accounts` — 연결된 계정 목록
- `POST /api/schedules` — 예약 생성
- `GET /api/schedules` — 예약 목록 (status 필터 가능)
- `PUT /api/schedules/{id}` — 예약 수정 (pending만)
- `DELETE /api/schedules/{id}` — 예약 삭제 (pending만)

## Core Flows

1. **인증**: OAuth2 PKCE → 토큰 저장 → 만료 시 자동 갱신
2. **업로드**: APScheduler DateTrigger → 토큰 갱신 → TikTok API init → 10MB 청크 업로드 → 상태 폴링 (최대 30회)
3. **서버 재시작**: lifespan에서 DB의 pending 작업을 APScheduler에 재등록

## Environment Variables

`.env.example` 참조. 주요 항목:
- `TT_CLIENT_KEY`, `TT_CLIENT_SECRET` — TikTok API 자격증명
- `TT_REDIRECT_URI` — OAuth 콜백 URL
- `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `SECRET_KEY`, `ENCRYPTION_KEY`
- `VIDEO_DIR` — 비디오 저장 경로

## Development Notes

- DB 마이그레이션: SQLAlchemy `create_all()` 자동 (별도 마이그레이션 도구 없음)
- CORS: localhost:3000, localhost:8000 허용
- Frontend 대시보드 30초 자동 새로고침