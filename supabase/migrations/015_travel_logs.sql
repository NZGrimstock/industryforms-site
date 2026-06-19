-- Travel logs: auto-tracked vehicle trips and manual entries
create table if not exists travel_logs (
  id             uuid primary key default gen_random_uuid(),
  company_id     uuid references companies(id) on delete cascade,
  profile_id     uuid references profiles(id) on delete set null,
  started_at     timestamptz not null,
  ended_at       timestamptz,
  start_lat      float,
  start_lng      float,
  end_lat        float,
  end_lng        float,
  distance_km    float default 0,
  -- purpose: null = unallocated, 'work', 'personal', 'ignore'
  purpose        text,
  job_id         uuid references jobs(id) on delete set null,
  notes          text,
  is_auto        boolean default true,
  created_at     timestamptz default now()
);

alter table travel_logs enable row level security;

create policy "travel_logs_company_access" on travel_logs
  using (company_id in (
    select company_id from profiles where id = auth.uid()
  ))
  with check (company_id in (
    select company_id from profiles where id = auth.uid()
  ));

create index if not exists idx_travel_logs_profile_date
  on travel_logs (profile_id, started_at desc);

create index if not exists idx_travel_logs_company_date
  on travel_logs (company_id, started_at desc);
