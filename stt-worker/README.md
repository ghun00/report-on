# STT Worker (Report-on)

Node.js + Express 워커: Supabase Storage 오디오 → ffmpeg WAV(16kHz mono) → **NCP Object Storage** 업로드 → **CLOVA Speech 장문 인식(Object Storage)** → 결과를 Supabase `public.reports`에 저장합니다.

- **비동기**: `POST /jobs/start-stt`는 작업 시작만 받고 즉시 `{ ok: true }` 응답 후, 백그라운드에서 처리합니다.
- 7분 이상 파일도 폴링 타임아웃(기본 10분) 내에서 안정적으로 처리합니다.

---

## 환경 변수

### Supabase

| 변수 | 필수 | 설명 |
|------|------|------|
| `SUPABASE_URL` | ✅ | Supabase 프로젝트 URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase **service role** 키 (브라우저 노출 금지) |
| `SUPABASE_STORAGE_BUCKET` | | Storage 버킷 이름 (기본값: `audio`) |

### NCP Object Storage (S3 호환)

| 변수 | 필수 | 설명 |
|------|------|------|
| `NCP_STT_BUCKET` | ✅ | 장문 인식용 오디오 업로드 버킷 (예: `reporton-stt-kr`) |
| `NCP_STT_REGION` | | 리전 (기본값: `kr`) |
| `NCP_ACCESS_KEY` | ✅ | NCP Object Storage Access Key (S3 API용) |
| `NCP_SECRET_KEY` | ✅ | NCP Object Storage Secret Key |
| `NCP_ENDPOINT` | ✅ | S3 호환 엔드포인트 (예: `https://kr.object.ncloudstorage.com`) |

### CLOVA Speech 장문 인식

| 변수 | 필수 | 설명 |
|------|------|------|
| `CLOVA_SECRET_KEY` | ✅ | CLOVA Speech API Secret Key (헤더 `X-CLOVASPEECH-API-KEY`) |
| `CLOVA_LONG_ENDPOINT` | ✅ | 장문 인식 작업 생성 URL (예: `https://clovaspeech-gw.ncloud.com/.../recognizer/object-storage`) |
| `CLOVA_LONG_STATUS_ENDPOINT` | ✅ | 작업 상태 조회 URL. `?token=` 또는 `&token=` 자동 추가. 또는 `{{token}}` 포함 시 치환 (예: `https://.../result/{{token}}`) |

### 기타

| 변수 | 필수 | 설명 |
|------|------|------|
| `PORT` | | 서버 포트 (기본값: `3001`) |
| `DELETE_NCP_AFTER_SUCCESS` | | STT 성공 후 NCP `input/{reportId}.wav` 삭제 여부. `false`면 삭제 안 함 (기본: 삭제) |

---

## NCP Object Storage / CLOVA 설정 예시

### NCP Object Storage

1. NCP 콘솔에서 Object Storage 버킷 생성 (예: `reporton-stt-kr`).
2. **API 인증키** 발급 (마이페이지 → 계정 관리 → 인증키 관리) → Access Key / Secret Key 확인.
3. S3 API 호환 엔드포인트:
   - 한국 리전: `https://kr.object.ncloudstorage.com`
4. CLOVA Speech **도메인**에서 “인식 대상 저장 경로”를 버킷 내 `input`(또는 사용할 prefix)으로 설정해 두면, 워커가 업로드하는 `input/{reportId}.wav`를 인식할 수 있습니다.

### CLOVA 장문 인식 (Object Storage)

1. CLOVA Speech 콘솔에서 **도메인** 생성 시 “인식 대상 저장 경로”를 위 NCP 버킷 경로와 맞춥니다 (예: `input`).
2. **Invoke URL** 확인:
   - 작업 생성: `https://clovaspeech-gw.ncloud.com/external/v1/{invoke-id}/recognizer/object-storage`
   - 상태 조회: 동일 베이스 + `/result` 또는 문서에 안내된 상태 조회 URL (예: `https://.../result?token=` 이면 `CLOVA_LONG_STATUS_ENDPOINT=https://.../result` 로 설정).
3. **Secret Key**를 CLOVA Speech 앱에서 발급받아 `CLOVA_SECRET_KEY`로 설정합니다.

---

## DB 전제

`public.reports` 테이블에 다음 컬럼이 있어야 합니다.

- `id` (uuid)
- `status` (text): `uploading` | `generating` | `done` | `failed`
- `transcript` (text, nullable)
- `audio_path` (text, nullable)
- `error_message` (text, nullable): 실패 시 디버깅용 메시지 저장

선택적으로 `ncp_object_key`, `stt_job_id` 컬럼을 추가해 두면, 나중에 워커에서 저장하도록 확장할 수 있습니다.

---

## API

### POST /jobs/start-stt

동일. body `{ "reportId": "uuid" }`, 즉시 `{ "ok": true }`.

### GET /health

동일. `200` + `{ "ok": true }`.

---

## 처리 흐름 (백그라운드)

1. Supabase에서 report row 조회 → Storage에서 오디오 다운로드
2. ffmpeg로 WAV 16kHz mono 변환
3. NCP Object Storage에 `input/{reportId}.wav` 업로드 (Content-Type: audio/wav)
4. CLOVA 장문 인식 작업 생성 (Object Storage dataKey 지정)
5. 상태 조회 URL로 2초 간격 폴링 (최대 약 10분)
6. 완료 시 `transcript` 추출 (전체 텍스트 또는 segments 합침)
7. Supabase `reports` 업데이트: `transcript`, `status='done'`, `error_message=null`
8. (기본 ON) NCP `input/{reportId}.wav` 삭제
9. 임시 파일 삭제  
실패 시 `status='failed'`, `error_message`에 원인 저장.

---

## Render 환경 변수 예시

| Key | Value |
|-----|--------|
| `SUPABASE_URL` | `https://xxx.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | (Service role key) |
| `SUPABASE_STORAGE_BUCKET` | `audio` |
| `NCP_STT_BUCKET` | `reporton-stt-kr` |
| `NCP_STT_REGION` | `kr` |
| `NCP_ACCESS_KEY` | (NCP Access Key) |
| `NCP_SECRET_KEY` | (NCP Secret Key) |
| `NCP_ENDPOINT` | `https://kr.object.ncloudstorage.com` |
| `CLOVA_SECRET_KEY` | (CLOVA Speech Secret Key) |
| `CLOVA_LONG_ENDPOINT` | `https://clovaspeech-gw.ncloud.com/.../recognizer/object-storage` |
| `CLOVA_LONG_STATUS_ENDPOINT` | `https://clovaspeech-gw.ncloud.com/.../recognizer/object-storage/result` |
| `PORT` | `3001` |

---

## 로컬 실행 / Docker

로컬: `npm install` 후 `npm run build && npm start` (ffmpeg 설치 필요).  
Docker: 프로젝트 루트의 `stt-worker/Dockerfile` 사용 (Node + ffmpeg 포함).

---

## 주의사항

- **SUPABASE_SERVICE_ROLE_KEY**, **NCP_SECRET_KEY**, **CLOVA_SECRET_KEY**는 서버 전용입니다. 브라우저에 노출하지 마세요.
- CLOVA 도메인의 “인식 대상 저장 경로”와 워커가 업로드하는 경로(`input/`)가 일치해야 합니다.
