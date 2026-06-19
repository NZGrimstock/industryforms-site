-- Form templates: reusable form definitions (e.g. "Electrical Safety Certificate")
create table form_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  description text,
  fields jsonb not null default '[]',  -- array of field definitions
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index form_templates_company_id_idx on form_templates(company_id);
alter table form_templates enable row level security;
create policy "company members can manage form_templates" on form_templates
  for all using (company_id = current_company_id());

-- Form submissions: filled-in forms attached to a job
create table form_submissions (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  template_id uuid references form_templates(id) on delete set null,
  template_name text not null,
  answers jsonb not null default '{}',  -- field_id -> value
  submitted_by uuid references profiles(id),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index form_submissions_job_id_idx on form_submissions(job_id);
alter table form_submissions enable row level security;
create policy "company members can manage form_submissions" on form_submissions
  for all using (company_id = current_company_id());
