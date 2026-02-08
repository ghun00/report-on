# STT Worker (Report-on)

Node.js + Express 워커: Supabase Storage 오디오 → ffmpeg로 WAV(16kHz mono) 변환 → CLOVA Speech STT → 결과를 Supabase `public.reports`에 저장합니다.

- **비동기**: `POST /jobs/start-stt`는 작업 시작만 받고 즉시 `{ ok: true }` 응답 후, 백그라운드에서 처리합니다.

---

## 환경 변수

| 변수 | 필수 | 설명 |
|------|------|------|
| `SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase **service role** 키 (브라우저 노출 금지) |
| `SUPABASE_STORAGE_BUCKET` | | Storage 버킷 이름 (기본값: `audio`) |
| `CLOVA_ENDPOINT` | ✅ | CLOVA Speech STT 요청 URL (예: `https://naveropenapi.apigw.ntruss.com/recog/v1/stt`) |
| `CLOVA_CLIENT_ID` | ✅ | CLOVA API Key ID (또는 `CLOVA_API_KEY` 사용) |
| `CLOVA_CLIENT_SECRET` | ✅ | CLOVA API Key Secret (또는 `CLOVA_API_KEY` 사용) |
| `PORT` | | 서버 포트 (기본값: `3001`) |

---

## DB 전제

`public.reports` 테이블에 다음 컬럼이 있어야 합니다.

- `id` (uuid)
- `status` (text): `uploading` | `generating` | `done` | `failed`
- `transcript` (text, nullable)
- `audio_path` (text, nullable): 있으면 이 경로로 다운로드, 없으면 `reports/{reportId}/raw.webm` 사용
- `error_message` (text, nullable): 실패 시 에러 메시지 저장

`error_message` 컬럼이 없다면 Supabase SQL Editor에서 실행:

```sql
alter table public.reports add column if not exists error_message text;
```

---

## API

### POST /jobs/start-stt

STT 작업을 큐에 넣고 즉시 응답합니다.

**Request**

```json
{ "reportId": "uuid-of-report" }
```

**Response (즉시)**

- `200`: `{ "ok": true }`
- `400`: `{ "ok": false, "error": "reportId required" }`

이후 백그라운드에서:

1. `reports`에서 해당 row 조회
2. Storage에서 오디오 다운로드 (`audio_path` 우선, 없으면 `reports/{reportId}/raw.webm`)
3. ffmpeg로 WAV 16kHz mono 변환
4. CLOVA Speech STT 호출
5. 성공 시 `reports` 업데이트: `transcript`, `status = 'done'`
6. 실패 시 `status = 'failed'`, `error_message` 저장

### GET /health

헬스 체크. `200` + `{ "ok": true }`.

---

## Storage 경로 규칙

- 버킷: `audio` (또는 `SUPABASE_STORAGE_BUCKET`)
- 경로: `reports/{reportId}/raw.webm` (확장자는 webm 가정)

---

## 로컬 실행

```bash
cd stt-worker
npm install
# .env 또는 환경변수 설정 후
npm run build && npm start
# 또는 개발 시
npm run dev
```

로컬에서 ffmpeg 필요:

```bash
# macOS
brew install ffmpeg
```

---

## Render에서 배포 (Web Service)

### 1. Render 대시보드

1. [Render](https://render.com) 로그인 후 **Dashboard** → **New** → **Web Service**
2. 저장소 연결 (이 레포지토리 선택)

### 2. 빌드·실행 설정

- **Root Directory**: `stt-worker` 로 설정 (모노레포인 경우)
- **Runtime**: `Docker` 선택  
  **또는** Runtime `Node`인 경우:
  - **Build Command**: `npm install && npm run build`
  - **Start Command**: `npm start`

Docker 사용 시:

- **Dockerfile Path**: `stt-worker/Dockerfile` (또는 루트가 stt-worker면 `Dockerfile`)

### 3. 환경 변수

Render **Environment** 탭에서 다음 추가:

| Key | Value |
|-----|--------|
| `SUPABASE_URL` | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key (Settings → API) |
| `SUPABASE_STORAGE_BUCKET` | `audio` |
| `CLOVA_ENDPOINT` | CLOVA STT URL (예: `https://naveropenapi.apigw.ntruss.com/recog/v1/stt`) |
| `CLOVA_CLIENT_ID` | CLOVA Client ID |
| `CLOVA_CLIENT_SECRET` | CLOVA Client Secret |
| `PORT` | `3001` (Render가 자동 할당할 수도 있음) |

### 4. 배포

- **Create Web Service** 후 자동 배포
- 로그에서 `STT worker listening on port ...` 확인
- **Health Check Path**: ` /health` 로 설정 권장

### 5. 동작 확인

```bash
curl -X POST https://<your-service>.onrender.com/jobs/start-stt \
  -H "Content-Type: application/json" \
  -d '{"reportId":"<실제-report-uuid>"}'
# 즉시 { "ok": true } 응답
# 이후 Supabase reports 테이블에서 해당 row의 transcript, status 확인
```

---

## 주의사항

- **SUPABASE_SERVICE_ROLE_KEY**는 서버 전용입니다. 브라우저/클라이언트에 노출하지 마세요.
- CLOVA STT 기본 제한(예: 60초, 3MB)을 초과하는 파일은 별도(long-form) API 또는 분할 처리 필요할 수 있습니다.
