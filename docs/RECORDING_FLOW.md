# 녹음 → Storage 업로드 → reports 연동 요약

## 수정·추가된 파일 목록

### 추가
- `src/lib/constants/reports.ts` — status 상수 (`uploading` | `generating` | `done` | `failed`)
- `src/lib/supabase/reports.ts` — Server Actions: `createReportRow`, `updateReportAfterUpload`, `updateReportFailed`, `createTestReportRow`
- `src/lib/supabase/upload-recording.ts` — 클라이언트: `uploadRecordingBlob` (Storage 업로드)
- `src/lib/supabase/fetch-reports.ts` — 훅: `useReportsFromDb` (reports 목록 조회, 생성중 우선 정렬)
- `docs/RECORDING_FLOW.md` — 이 문서

### 수정
- `src/contexts/reports-context.tsx` — `ReportStatus`를 constants에서 re-export, `getGeneratingReports`에 `uploading` 포함
- `src/components/ui/reportrow.tsx` — `uploading` 상태 라벨/스타일 추가
- `src/app/record/page.tsx` — 종료 시 DB row 생성 → Storage 업로드 → status 업데이트 연동, 실패 시 `failed` + 재시도 UI
- `src/app/home/page.tsx` — `useReportsFromDb`로 목록 조회, 테스트 버튼(개발 시만 노출)
- `src/app/storage/page.tsx` — `useReportsFromDb`로 목록 조회, 테스트 버튼(개발 시만 노출)
- `src/lib/supabase/middleware.ts` — `/record` 보호 경로 추가
- `docs/supabase-reports-table.sql` — status에 `uploading` 추가, 기존 DB용 ALTER 주석

---

## 테스트 방법

1. **로그인**  
   `/login`에서 카카오 로그인 후 `/home` 이동.

2. **녹음 → 종료 → 저장**  
   - `/record` 진입 후 30초 이상 녹음  
   - **종료** → **종료하고 저장**  
   - Phase A 전환 후 “상담 보고서를 만들고 있어요…” 화면 확인  
   - **홈으로 가기** 클릭

3. **Storage 확인**  
   Supabase Dashboard → Storage → `audio` 버킷 → `reports/{reportId}/raw.webm` 파일 생성 여부 확인.

4. **홈/저장소에서 생성중 표시**  
   - `/home` 또는 `/storage`에서 방금 만든 보고서가 **생성중** 배지와 함께 목록 상단附近에 노출되는지 확인.

5. **개발용 테스트 버튼**  
   - `NODE_ENV=development`일 때 `/home` 또는 `/storage` 하단의 **테스트 보고서 생성**으로 `status='generating'` row 1개 생성 후 목록 갱신 확인.

---

## DB status 값

- `uploading` — 녹음 종료 직후 row 생성 시
- `generating` — Storage 업로드 완료 후 (이후 AI 처리 가정)
- `done` / `failed` — 완료 또는 실패

기존 테이블에 `uploading`이 없으면 `docs/supabase-reports-table.sql` 하단의 ALTER 주석을 해제해 실행.
