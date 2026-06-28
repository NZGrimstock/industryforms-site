create table job_assignees (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique(job_id, profile_id)
);

alter table job_assignees enable row level security;

create policy "company members can manage job assignees"
  on job_assignees for all
  using (
    exists (
      select 1 from jobs j
      join profiles p on p.company_id = j.company_id
      where j.id = job_assignees.job_id and p.id = auth.uid()
    )
  );
