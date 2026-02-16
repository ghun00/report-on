# 레포트온(Report-on) 서비스 개요

**대상:** 이해관계자 · 비개발자  
**목적:** 서비스의 구현 방식과 동작 방식을 쉽게 이해할 수 있도록 정리

---

## 1. 서비스가 하는 일 (한 줄 요약)

**상담 녹음을 하면, AI가 음성을 텍스트(대본)로 바꿔 주고, 그 대본을 바탕으로 상담 보고서를 볼 수 있는 웹 서비스입니다.**

- 사용자가 **브라우저에서 녹음** → **저장**을 누르면
- **녹음 파일이 업로드**되고, **백그라운드에서 음성 인식(STT)**이 돌아가며
- 완료되면 **보고서 목록**에서 **대본이 포함된 보고서**를 볼 수 있습니다.

---

## 2. 사용자 입장의 흐름

| 단계 | 사용자 행동 | 화면/결과 |
|------|------------|-----------|
| 1 | 로그인 | 카카오로 로그인 → 홈(/home)으로 이동 |
| 2 | 녹음 시작 | 홈에서 "녹음 시작" → 마이크 권한 허용 → 녹음 화면(/record) |
| 3 | 녹음 | 일시정지/재개 가능, 30초 미만이면 "짧은 녹음" 안내 |
| 4 | 종료·저장 | "종료" → "종료하고 저장" → "상담 보고서를 만들고 있어요" 안내 → "홈으로 가기" |
| 5 | 홈/저장소 | 보고서 목록에서 **생성중** → (잠시 후) **완료**로 바뀜, 완료 시 토스트 알림 |
| 6 | 보고서 보기 | 완료된 항목 클릭 → `/reports/{id}` 에서 **대본(원문)** + **상담 보고서** 확인 |

- **생성중**인 항목은 클릭해도 상세로 가지 않으며, "다시 생성"은 실패한 항목에만 표시됩니다.
- **알림톡** 문구는 UI에만 있고, 실제 알림 발송 기능은 아직 구현되지 않은 상태입니다.

---

## 3. 시스템 구성 (구성 요소별 역할)

### 3.1 프론트엔드 (Next.js 웹 앱)

- **기술:** Next.js 16, React 19, Supabase(인증·DB·Storage 클라이언트)
- **역할**
  - **로그인:** 카카오 OAuth → Supabase Auth
  - **녹음:** 브라우저 마이크 → `MediaRecorder`로 `audio/webm` 녹음
  - **저장 플로우:** 보고서 row 생성 → Storage 업로드 → `audio_path` 갱신 → STT 워커 호출
  - **목록/상세:** Supabase `reports` 테이블 조회, **생성중** 항목은 주기적 폴링(5초, 탭 숨김 시 15초)으로 완료 감지
- **주요 경로**
  - `/login` — 로그인
  - `/home` — 홈(녹음 시작, 업로드, 나의 상담 내역)
  - `/record` — 녹음 화면
  - `/storage` — 상담 저장소(보고서 목록)
  - `/reports/[id]` — 보고서 상세(대본 + 보고서 레이아웃)

### 3.2 백엔드 (Next.js API + Supabase)

- **Next.js API**
  - `POST /api/stt/start`: body `{ reportId }` 받아서 **STT 워커**를 호출만 하고, 결과는 워커가 DB를 직접 갱신합니다.
- **Supabase**
  - **Auth:** 카카오 로그인, 세션·쿠키 갱신(미들웨어)
  - **DB:** `public.reports` 테이블 (id, user_id, status, title, duration_sec, audio_path, transcript, error_message 등)
  - **Storage:** `audio` 버킷, 경로 `reports/{reportId}/raw.webm`
- **보호 경로:** `/home`, `/storage`, `/record`, `/reports/*` — 로그인 없으면 `/login`으로 리다이렉트

### 3.3 STT 워커 (별도 Node.js 서버)

- **역할:** “녹음 파일 → 대본(transcript)” 변환만 담당합니다. **상담 보고서 내용(요약·섹션 등)을 만드는 AI는 아직 이 워커에 없고**, 현재는 **대본만** DB에 저장합니다.
- **진입점:** Next.js가 `POST {STT_WORKER_URL}/jobs/start-stt` 로 `{ reportId }` 전달 → 워커는 **즉시 200 + { ok: true }** 반환 후, **백그라운드**에서 처리합니다.
- **처리 순서 (요약)**
  1. Supabase에서 해당 report row 조회
  2. Storage에서 `reports/{reportId}/raw.webm` 다운로드
  3. **ffmpeg**로 WAV 16kHz 모노로 변환
  4. **NCP Object Storage**(S3 호환)에 `input/{reportId}.wav` 업로드
  5. **NAVER CLOVA Speech 장문 인식** API로 작업 생성 → 2초 간격 폴링(최대 약 10분)으로 완료 대기
  6. 완료 시 결과 JSON에서 **전체 텍스트(또는 segments 합침)** 추출
  7. Supabase `reports` 업데이트: `transcript`, `status='done'`, `error_message=null`
  8. (옵션) NCP 입력 WAV 삭제, 임시 파일 정리  
  실패 시 `status='failed'`, `error_message`에 원인 저장

- **환경:** Render 등에 별도 배포, Supabase Service Role Key, NCP Object Storage, CLOVA Speech API 키 필요 (상세는 `stt-worker/README.md` 참고).

---

## 4. 데이터 흐름 (녹음 저장 → 대본 완료)

```
[사용자] 종료·저장 클릭
    ↓
[Next.js /record] createReportRow(status='generating') → reportId 획득
    ↓
[Next.js] Supabase Storage에 reports/{reportId}/raw.webm 업로드
    ↓
[Next.js] updateReportAfterUpload(reportId, audio_path)
    ↓
[Next.js] POST /api/stt/start { reportId }
    ↓
[Next.js API] POST {STT_WORKER_URL}/jobs/start-stt { reportId } → 200 OK
    ↓
[STT 워커] 백그라운드: Storage 다운로드 → ffmpeg → NCP 업로드 → CLOVA 작업 → 폴링 → transcript 추출
    ↓
[STT 워커] Supabase reports 업데이트 (transcript, status='done')
    ↓
[프론트] 홈/저장소 폴링으로 status 변경 감지 → "완료" 표시·토스트
```

- **보고서 상세 페이지**의 “상담 보고서” 본문(핵심 요약, 상담 내용, 액션 아이템 등)은 **현재 더미 데이터**로 고정되어 있고, **실제 transcript(대본)**만 DB에서 가져와 **좌측 대본 패널**에 표시됩니다.

---

## 5. 보고서 상태(status) 의미

| status | 의미 |
|--------|------|
| `uploading` | (선택) row 막 생성된 직후 |
| `generating` | 녹음 업로드 완료 후 STT 워커가 처리 중 |
| `done` | STT 완료, transcript 저장됨 |
| `failed` | 업로드 실패 또는 STT 실패, `error_message`에 사유 |

- 목록/상세 화면에서는 `generating` / `uploading` 을 “생성중”으로 통일해 표시합니다.

---

## 6. 주요 기술·외부 서비스

| 구분 | 내용 |
|------|------|
| 프론트/API | Next.js 16, React 19, Tailwind CSS |
| 인증·DB·파일 | Supabase (Auth, PostgreSQL, Storage) |
| 녹음 | 브라우저 MediaRecorder (audio/webm), Chrome 권장 배너 있음 |
| STT | STT 워커(Node/Express) → ffmpeg → NCP Object Storage → NAVER CLOVA Speech 장문 인식 |
| 배포 | Next.js(예: Vercel), STT 워커(예: Render), 환경 변수로 URL·키 연동 |

---

## 7. 현재 한계·참고 사항 (이해관계자용)

- **상담 보고서 본문**은 아직 **고정 더미**입니다. 대본(transcript)만 실제 데이터이고, “핵심 요약·상담 내용·액션 아이템” 등은 추후 AI/비즈니스 로직으로 채울 수 있는 구조입니다.
- **알림톡**은 문구만 있고 실제 발송 미구현입니다.
- **녹음 파일 업로드**만 지원하며, “녹음 파일 업로드” 버튼 동작은 TODO 상태입니다.
- **실패한 보고서 “다시 생성”**은 현재 refetch만 하며, 재전송 API(/jobs/start-stt 재호출 등)는 미연동입니다.
- **Chrome 권장** 배너가 있으며, 녹음은 Chrome에서 안정적으로 동작하는 것을 전제로 합니다.

---

## 8. 문서·코드 위치 참고

| 목적 | 문서/경로 |
|------|-----------|
| 녹음 → Storage → STT → reports 연동 | `docs/RECORDING_FLOW.md` |
| 카카오 로그인·보호 경로 | `docs/AUTH_SETUP.md` |
| STT 워커 환경 변수·처리 흐름 | `stt-worker/README.md` |
| DB 테이블·RLS | `docs/supabase-reports-table.sql` |

이 문서는 코드를 수정하지 않고 코드베이스 열람만으로 작성되었습니다.
