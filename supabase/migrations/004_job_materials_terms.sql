-- Default terms on company
alter table companies add column if not exists default_terms text;

-- Job materials: parts/materials added directly to a job (not via quote)
create table job_materials (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  price_list_item_id uuid references price_list_items(id) on delete set null,
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'each',
  unit_cost numeric(10,2) not null default 0,
  unit_price numeric(10,2) not null default 0,
  added_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index job_materials_job_id_idx on job_materials(job_id);

alter table job_materials enable row level security;
create policy "company members can view job_materials" on job_materials
  for select using (company_id = current_company_id());
create policy "company members can insert job_materials" on job_materials
  for insert with check (company_id = current_company_id());
create policy "company members can delete job_materials" on job_materials
  for delete using (company_id = current_company_id());
