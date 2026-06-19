-- Storage bucket for job photos
insert into storage.buckets (id, name, public)
values ('job-photos', 'job-photos', true)
on conflict (id) do nothing;

-- RLS for storage objects
create policy "Company members can upload job photos" on storage.objects
  for insert with check (
    bucket_id = 'job-photos'
    and auth.role() = 'authenticated'
  );

create policy "Job photos are publicly readable" on storage.objects
  for select using (bucket_id = 'job-photos');

create policy "Uploaders can delete their own photos" on storage.objects
  for delete using (bucket_id = 'job-photos' and owner = auth.uid());

-- Add missing columns to existing job_photos table
alter table job_photos add column if not exists company_id uuid references companies(id) on delete cascade;
alter table job_photos add column if not exists created_at timestamptz not null default now();

-- Backfill company_id from the parent job
update job_photos p
set company_id = j.company_id
from jobs j
where j.id = p.job_id and p.company_id is null;

create index if not exists job_photos_job_id_idx on job_photos(job_id);

alter table job_photos enable row level security;

create policy "Company members can view job photos" on job_photos
  for select using (company_id = current_company_id());

create policy "Company members can insert job photos" on job_photos
  for insert with check (company_id = current_company_id());

create policy "Company members can delete job photos" on job_photos
  for delete using (company_id = current_company_id());

-- Xero integration columns
alter table companies add column if not exists xero_tenant_id text;
alter table companies add column if not exists xero_access_token text;
alter table companies add column if not exists xero_refresh_token text;
alter table companies add column if not exists xero_token_expires_at timestamptz;
