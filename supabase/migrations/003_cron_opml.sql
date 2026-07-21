-- LeafReader scheduled refresh and OPML import support.
-- Apply after 002_real_rss.sql.

alter table public.feeds
  add column if not exists refreshing_at timestamptz,
  add column if not exists next_fetch_at timestamptz;

create index if not exists feeds_refresh_claim_idx
  on public.feeds (next_fetch_at nulls first, last_fetched_at nulls first)
  where status in ('active', 'degraded');

create or replace function public.claim_feeds_for_refresh(
  batch_limit integer default 12,
  stale_before timestamptz default now() - interval '1 hour'
)
returns setof public.feeds
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with claimed as (
    select id
    from public.feeds
    where status in ('active', 'degraded')
      and coalesce(refreshing_at, '-infinity'::timestamptz) < now() - interval '15 minutes'
      and coalesce(next_fetch_at, last_fetched_at, '-infinity'::timestamptz) <= stale_before
    order by coalesce(next_fetch_at, last_fetched_at, created_at) asc
    limit least(greatest(batch_limit, 1), 50)
    for update skip locked
  )
  update public.feeds f
  set refreshing_at = now(),
      updated_at = now()
  from claimed
  where f.id = claimed.id
  returning f.*;
end;
$$;

revoke all on function public.claim_feeds_for_refresh(integer, timestamptz) from anon, authenticated;
