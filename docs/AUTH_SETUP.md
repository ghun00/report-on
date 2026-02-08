# Supabase Auth (카카오 로그인) 설정 요약

## 수정/추가된 파일 목록

### 추가
- `src/lib/supabase/client.ts` — 브라우저용 Supabase 클라이언트
- `src/lib/supabase/server.ts` — 서버용 Supabase 클라이언트 (cookies 기반)
- `src/lib/supabase/middleware.ts` — 세션 갱신 + 보호 경로 리다이렉트
- `src/lib/supabase/test-reports-db.ts` — reports 테이블 insert/select 테스트 (Server Action)
- `src/app/auth/callback/route.ts` — OAuth 코드 교환 + redirect
- `middleware.ts` — 루트 미들웨어 (updateSession 호출)
- `.env.example` — 환경 변수 예시

### 수정
- `src/app/login/page.tsx` — 카카오 로그인 버튼, 로그인 후 유저 정보/로그아웃/홈 링크, 세션 상태 반영
- `src/app/home/page.tsx` — DB 테스트 버튼 및 결과 표시 추가
- `package.json` — `@supabase/supabase-js`, `@supabase/ssr` 의존성 추가

---

## 환경 변수

`.env.local`에 다음을 설정하세요.

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON=your-anon-key
```

Supabase Dashboard → Project Settings → API에서 확인할 수 있습니다.

---

## Supabase 대시보드 설정

1. **Authentication → Providers → Kakao**  
   - Kakao 사용 설정  
   - Kakao 개발자 콘솔에서 발급한 REST API 키(Client ID) / Client Secret 입력  
   - Redirect URL: Supabase가 안내하는 콜백 URL 사용 (Kakao 쪽에 등록)

2. **Kakao 개발자 콘솔**  
   - 로그인 Redirect URI에 Supabase Auth URL 추가  
     예: `https://<project-ref>.supabase.co/auth/v1/callback`

---

## 실행 방법

1. `.env.local`에 `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON` 설정
2. `npm run dev` 실행
3. 브라우저에서 `/login` 접속
4. **카카오로 시작하기** 클릭 → 카카오 로그인 → 콜백 후 `/home`으로 이동되는지 확인
5. 로그인된 상태에서 `/home` 하단 **DB 테스트 (reports insert/select)** 버튼으로 insert/select 동작 확인 (콘솔 로그 및 화면 메시지)

---

## 보호 경로

미들웨어에서 로그인 없이 접근 시 `/login`으로 리다이렉트하는 경로:

- `/home`
- `/storage`
- `/reports` 및 `/reports/*`

---

## reports 테이블 테스트

- `src/lib/supabase/test-reports-db.ts`에서 **로그인한 유저**로 `reports` 테이블에 더미 행을 insert한 뒤 select하여 콘솔에 출력합니다.
- **테이블이 없다는 에러가 나는 경우**: Supabase Dashboard → **SQL Editor**에서 `docs/supabase-reports-table.sql` 내용을 붙여 넣고 실행해 `public.reports` 테이블과 RLS 정책을 생성하세요.
- RLS가 `auth.uid()` 기준으로 동작하는지 확인하려면, 위 SQL로 테이블 생성 후 DB 테스트 버튼을 눌러 insert/select가 성공하는지 보면 됩니다.
- 실제 테이블 스키마가 다르면 `test-reports-db.ts`의 `insert` payload를 테이블 컬럼에 맞게 수정하세요 (기본 가정: `user_id`, `title`).
