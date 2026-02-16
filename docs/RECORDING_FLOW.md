# 녹음 → Storage 업로드 → STT 워커 → reports 연동 요약

## 환경변수 (Next.js 앱)

| 변수 | 설명 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL |
| `NEXT_PUBLIC_SUPABASE_ANON` (또는 `NEXT_PUBLIC_SUPABASE_KEY`) | Supabase anon key |
| `STT_WORKER_URL` | **(서버 전용)** STT 워커 base URL. `POST /api/stt/start`가 이 URL로 워커를 호출. 예: `https://report-on.onrender.com`. 미설정 시 기본값 사용 |

---

## 종료 플로우 (한 번에 진행)

1. **reports row 생성** — `status: 'generating'`, `user_id`는 `supabase.auth.getUser()` (서버)
2. **녹음 blob 업로드** — Supabase Storage `audio` 버킷, 경로 `reports/{reportId}/raw.webm`, `upsert: true`
3. **reports.audio_path 업데이트** — 업로드 경로로 갱신
4. **STT 워커 호출** — `POST {NEXT_PUBLIC_STT_WORKER_URL}/jobs/start-stt` body `{ reportId }`
5. **홈으로 이동** — 성공/실패(워커 트리거 실패 포함) 후 `router.push("/home")`. 홈/저장소 폴링으로 generating → done/failed 자동 반영

에러 시: reports 생성/업로드 실패 → `status='failed'`, `error_message` 설정 후 알럿·재시도. 워커 호출 실패 → `error_message`만 설정, status는 generating 유지 후 홈으로 이동.

---

## 수정·추가된 파일 목록

### 추가
- `src/lib/constants/reports.ts` — status 상수
- `src/lib/supabase/reports.ts` — Server Actions: `createReportRow`, `updateReportAfterUpload`, `updateReportFailed`, `updateReportErrorMessage`, `createTestReportRow`
- `src/lib/supabase/upload-recording.ts` — `uploadRecordingBlob` (contentType: blob.type \|\| 'audio/webm')
- `src/lib/supabase/fetch-reports.ts` — `useReportsFromDb` (폴링·완료 토스트 포함)
- `docs/RECORDING_FLOW.md` — 이 문서

### 수정
- `src/app/record/page.tsx` — 종료 시 row 생성(generating) → 업로드 → audio_path 업데이트 → 워커 호출 → 홈 이동, "저장 중…" 상태 표시
- `src/app/home/page.tsx` — `useReportsFromDb`, 완료 토스트
- `src/app/storage/page.tsx` — `useReportsFromDb`, 완료 토스트
- `src/components/ui/reportrow.tsx` — generating/done/failed UX, 실패 시 툴팁·다시 생성

---

## 테스트 방법

1. **로그인** — `/login`에서 카카오 로그인 후 `/home` 이동.
2. **녹음 → 종료 → 저장**  
   - `/record` 진입 후 10~15초 이상 녹음  
   - **종료** → 확인 후 **종료하고 저장**  
   - "저장 중…" 스피너 후 자동으로 **홈** 이동.
3. **Storage** — `audio` 버킷 → `reports/{reportId}/raw.webm` 생성 확인.
4. **홈/저장소** — 해당 보고서가 **생성중** → 폴링으로 **완료**로 자동 전환되는지 확인.

---

## DB status 값

- `uploading` — (선택) 녹음 직후 row 생성 시
- `generating` — row 생성 시 사용. Storage 업로드 후에도 유지. 워커가 transcript 채우면 `done`
- `done` / `failed` — 완료 또는 실패
