-- Supabase Dashboard → SQL Editor에서 실행하세요.
-- 확장된 reports 테이블 + RLS (녹음/보고서/공유 토큰 지원)

-- 0) UUID 생성에 필요한 확장 (대부분 이미 되어있지만 안전하게)
create extension if not exists pgcrypto;

-- 1) reports 테이블 생성
create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'uploading' check (status in ('uploading', 'generating', 'done', 'failed')),
  created_at timestamptz not null default now(),
  duration_sec integer,
  audio_path text,
  transcript text,
  report_json jsonb,
  share_token text unique,
  title text,
  error_message text
);

-- 2) RLS 활성화
alter table public.reports enable row level security;

-- 3) 정책: 본인 데이터만 접근 가능
drop policy if exists "reports_select_own" on public.reports;
create policy "reports_select_own"
  on public.reports for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "reports_insert_own" on public.reports;
create policy "reports_insert_own"
  on public.reports for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "reports_update_own" on public.reports;
create policy "reports_update_own"
  on public.reports for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "reports_delete_own" on public.reports;
create policy "reports_delete_own"
  on public.reports for delete to authenticated
  using (auth.uid() = user_id);

-- 4) 인덱스 (목록 조회·공유 링크 조회용)
create index if not exists reports_user_id_idx on public.reports (user_id);
create index if not exists reports_share_token_idx on public.reports (share_token) where share_token is not null;

-- (기존 테이블에 'uploading'이 없을 경우에만 실행)
-- alter table public.reports drop constraint if exists reports_status_check;
-- alter table public.reports add constraint reports_status_check check (status in ('uploading', 'generating', 'done', 'failed'));

-- (기존 테이블에 error_message 컬럼이 없을 경우, STT 워커용)
-- alter table public.reports add column if not exists error_message text;
