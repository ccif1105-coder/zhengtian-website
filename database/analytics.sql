create extension if not exists pgcrypto;

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  visitor_id text not null,
  session_id text not null,
  event_type text not null,
  event_label text not null default '',
  page_path text not null default '/',
  page_title text not null default '',
  referrer text not null default '',
  source text not null default 'direct',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  country text not null default '',
  region text not null default '',
  city text not null default '',
  device text not null default 'desktop',
  metadata jsonb not null default '{}'::jsonb,
  constraint analytics_event_type_length check (char_length(event_type) between 1 and 40),
  constraint analytics_visitor_length check (char_length(visitor_id) between 8 and 80),
  constraint analytics_session_length check (char_length(session_id) between 8 and 80)
);

create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_type_idx on public.analytics_events (event_type, created_at desc);
create index if not exists analytics_events_source_idx on public.analytics_events (source, created_at desc);
create index if not exists analytics_events_page_idx on public.analytics_events (page_path, created_at desc);

alter table public.analytics_events enable row level security;
revoke all on public.analytics_events from anon, authenticated;

create or replace function public.get_analytics_summary(p_days integer default 30)
returns jsonb
language sql
security definer
set search_path = public
as $$
  with
  settings as (
    select greatest(1, least(coalesce(p_days, 30), 90))::integer as days
  ),
  filtered as (
    select *
    from public.analytics_events, settings
    where created_at >= now() - make_interval(days => settings.days)
  ),
  totals as (
    select
      count(*) filter (where event_type = 'page_view')::integer as page_views,
      count(distinct visitor_id) filter (where event_type = 'page_view')::integer as visitors,
      count(distinct session_id) filter (where event_type = 'page_view')::integer as sessions,
      count(*) filter (where event_type = 'cta_click')::integer as cta_clicks,
      count(*) filter (where event_type = 'phone_click')::integer as phone_clicks,
      count(*) filter (where event_type = 'qr_view')::integer as qr_views
    from filtered
  ),
  date_range as (
    select generate_series(
      (now() at time zone 'Asia/Hong_Kong')::date - ((select days from settings) - 1),
      (now() at time zone 'Asia/Hong_Kong')::date,
      interval '1 day'
    )::date as day
  ),
  daily as (
    select
      date_range.day,
      count(filtered.id) filter (where filtered.event_type = 'page_view')::integer as page_views,
      count(distinct filtered.visitor_id) filter (where filtered.event_type = 'page_view')::integer as visitors,
      count(filtered.id) filter (where filtered.event_type in ('cta_click', 'phone_click'))::integer as inquiries
    from date_range
    left join filtered on (filtered.created_at at time zone 'Asia/Hong_Kong')::date = date_range.day
    group by date_range.day
    order by date_range.day
  ),
  sources as (
    select source as name, count(*)::integer as value
    from filtered
    where event_type = 'page_view'
    group by source
    order by value desc, name
    limit 12
  ),
  cities as (
    select coalesce(nullif(city, ''), nullif(region, ''), nullif(country, ''), '未知地区') as name,
           count(*)::integer as value
    from filtered
    where event_type = 'page_view'
    group by 1
    order by value desc, name
    limit 12
  ),
  pages as (
    select page_path as name, count(*)::integer as value
    from filtered
    where event_type = 'page_view'
    group by page_path
    order by value desc, name
    limit 12
  ),
  recent as (
    select created_at, event_type, event_label, page_path, source,
           coalesce(nullif(city, ''), nullif(region, ''), nullif(country, ''), '未知地区') as location,
           device
    from filtered
    order by created_at desc
    limit 60
  )
  select jsonb_build_object(
    'days', (select days from settings),
    'generatedAt', now(),
    'totals', to_jsonb(totals),
    'daily', coalesce((select jsonb_agg(to_jsonb(daily) order by day) from daily), '[]'::jsonb),
    'sources', coalesce((select jsonb_agg(to_jsonb(sources)) from sources), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(to_jsonb(cities)) from cities), '[]'::jsonb),
    'pages', coalesce((select jsonb_agg(to_jsonb(pages)) from pages), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(to_jsonb(recent) order by created_at desc) from recent), '[]'::jsonb)
  )
  from totals;
$$;

revoke all on function public.get_analytics_summary(integer) from public, anon, authenticated;
grant execute on function public.get_analytics_summary(integer) to service_role;
