alter table profiles
  add column if not exists google_access_token text,
  add column if not exists google_refresh_token text,
  add column if not exists google_token_expiry timestamptz,
  add column if not exists google_calendar_id text default 'primary';

create table if not exists calendar_sync_log (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies(id) on delete cascade,
  job_visit_id uuid references job_visits(id) on delete cascade,
  google_event_id text not null,
  synced_at timestamptz default now(),
  direction text default 'push'
);
