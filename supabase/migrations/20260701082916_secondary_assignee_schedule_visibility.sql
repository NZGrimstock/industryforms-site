-- Secondary job assignees must see the job and its scheduled visits.
-- Denormalise company_id onto job_assignees so RLS and PowerSync can scope
-- assignment rows without circular policy lookups through jobs.

alter table job_assignees
  add column if not exists company_id uuid references companies(id) on delete cascade;

update job_assignees ja
set company_id = j.company_id
from jobs j
where ja.job_id = j.id
  and ja.company_id is null;

create or replace function set_job_assignee_company_id()
returns trigger as $$
begin
  select company_id into new.company_id
  from jobs
  where id = new.job_id;
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_company_id on job_assignees;
create trigger set_company_id before insert or update on job_assignees
  for each row execute function set_job_assignee_company_id();

alter table job_assignees replica identity full;

drop policy if exists "company members can manage job assignees" on job_assignees;
drop policy if exists "members select job assignees" on job_assignees;
drop policy if exists "admins insert job assignees" on job_assignees;
drop policy if exists "admins delete job assignees" on job_assignees;

create policy "members select job assignees"
  on job_assignees for select
  using (
    company_id = current_company_id()
    and (is_admin_or_owner() or profile_id = auth.uid())
  );

create policy "admins insert job assignees"
  on job_assignees for insert
  with check (
    company_id = current_company_id()
    and is_admin_or_owner()
  );

create policy "admins delete job assignees"
  on job_assignees for delete
  using (
    company_id = current_company_id()
    and is_admin_or_owner()
  );

drop policy if exists "members select jobs" on jobs;
create policy "members select jobs" on jobs
  for select using (
    company_id = current_company_id()
    and (
      is_admin_or_owner()
      or assigned_to = auth.uid()
      or exists (
        select 1 from job_assignees ja
        where ja.job_id = jobs.id
          and ja.profile_id = auth.uid()
          and ja.company_id = current_company_id()
      )
    )
  );

drop policy if exists "members select visits" on job_visits;
create policy "members select visits" on job_visits
  for select using (job_id in (
    select id from jobs
    where company_id = current_company_id()
      and (
        is_admin_or_owner()
        or assigned_to = auth.uid()
        or exists (
          select 1 from job_assignees ja
          where ja.job_id = jobs.id
            and ja.profile_id = auth.uid()
            and ja.company_id = current_company_id()
        )
      )
  ));

drop policy if exists "members select job notes" on job_notes;
create policy "members select job notes" on job_notes
  for select using (job_id in (
    select id from jobs
    where company_id = current_company_id()
      and (
        is_admin_or_owner()
        or assigned_to = auth.uid()
        or exists (
          select 1 from job_assignees ja
          where ja.job_id = jobs.id
            and ja.profile_id = auth.uid()
            and ja.company_id = current_company_id()
        )
      )
  ));

drop policy if exists "members select job photos" on job_photos;
create policy "members select job photos" on job_photos
  for select using (job_id in (
    select id from jobs
    where company_id = current_company_id()
      and (
        is_admin_or_owner()
        or assigned_to = auth.uid()
        or exists (
          select 1 from job_assignees ja
          where ja.job_id = jobs.id
            and ja.profile_id = auth.uid()
            and ja.company_id = current_company_id()
        )
      )
  ));

drop policy if exists "members view job_materials" on job_materials;
create policy "members view job_materials" on job_materials
  for select using (job_id in (
    select id from jobs
    where company_id = current_company_id()
      and (
        is_admin_or_owner()
        or assigned_to = auth.uid()
        or exists (
          select 1 from job_assignees ja
          where ja.job_id = jobs.id
            and ja.profile_id = auth.uid()
            and ja.company_id = current_company_id()
        )
      )
  ));

do $$
begin
  alter publication powersync add table job_assignees;
exception
  when duplicate_object then null;
end $$;
