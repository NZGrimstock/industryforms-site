-- Progress claims: multi-stage billing for a job
create table progress_claims (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  stage_number int not null,
  name text not null,                    -- e.g. "Deposit", "Stage 1 – Rough-in", "Final"
  amount numeric(12,2) not null,
  percentage numeric(5,2),              -- % of total job value (informational)
  status text not null default 'pending' check (status in ('pending', 'invoiced', 'paid')),
  invoice_id uuid references invoices(id) on delete set null,
  due_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_id, stage_number)
);

create index progress_claims_job_id_idx on progress_claims(job_id);
alter table progress_claims enable row level security;
create policy "company members can manage progress_claims" on progress_claims
  for all using (company_id = current_company_id());
