-- LeafReader real RSS ingestion support.
-- Apply after supabase/schema.sql.

alter table public.feeds
  add column if not exists etag text,
  add column if not exists last_modified text,
  add column if not exists last_success_at timestamptz,
  add column if not exists last_error_at timestamptz,
  add column if not exists last_error text,
  add column if not exists error_count integer not null default 0 check (error_count >= 0);

alter table public.feeds
  drop constraint if exists feeds_status_check;

alter table public.feeds
  add constraint feeds_status_check
  check (status in ('pending', 'active', 'paused', 'error', 'degraded'));

create table if not exists public.feed_fetch_logs (
  id uuid primary key default gen_random_uuid(),
  feed_id uuid references public.feeds(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  trigger text not null default 'manual' check (trigger in ('manual', 'subscribe', 'cron', 'opml')),
  status text not null check (status in ('success', 'not_modified', 'error')),
  http_status integer,
  articles_found integer not null default 0 check (articles_found >= 0),
  articles_created integer not null default 0 check (articles_created >= 0),
  error_message text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now()
);

create index if not exists feeds_status_last_fetched_idx
  on public.feeds (status, last_fetched_at);
create index if not exists feed_fetch_logs_feed_created_idx
  on public.feed_fetch_logs (feed_id, created_at desc);
create index if not exists feed_fetch_logs_user_created_idx
  on public.feed_fetch_logs (user_id, created_at desc)
  where user_id is not null;
create index if not exists articles_library_published_idx
  on public.articles (feed_id, published_at desc, created_at desc);

alter table public.feed_fetch_logs enable row level security;

drop policy if exists "feed_fetch_logs_select_own" on public.feed_fetch_logs;
create policy "feed_fetch_logs_select_own" on public.feed_fetch_logs
for select to authenticated
using ((select auth.uid()) = user_id);

revoke all on public.feed_fetch_logs from anon;
revoke insert, update, delete on public.feed_fetch_logs from authenticated;
grant select on public.feed_fetch_logs to authenticated;

revoke insert, update, delete on public.feeds, public.articles from authenticated;
