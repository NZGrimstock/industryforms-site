-- Migration 020: Compliance documents (Producer Statements + RBW forms)

-- Add compliance fields to profiles
alter table profiles
  add column if not exists lbp_number text,
  add column if not exists cpeng_number text,
  add column if not exists signature_base64 text,
  add column if not exists council text default 'auckland';

-- Auto-increment doc number sequence
create sequence if not exists compliance_doc_seq start 1000;

-- Compliance documents table
create table if not exists compliance_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  profile_id uuid not null references profiles(id) on delete cascade,
  doc_number text not null,
  doc_type text not null, -- PS1, PS2, PS3_GENERAL, PS3_DRAINAGE, PS3_PLUMBING, PS4, RBW_2A, RBW_6A
  ac_form_code text, -- e.g. AC2310
  bc_reference text, -- building consent number
  client_name text,
  client_email text,
  project_address text,
  territorial_authority text,
  statement_data jsonb not null default '{}',
  pdf_path text,
  status text not null default 'completed',
  created_at timestamptz default now()
);

create index if not exists idx_compliance_docs_job on compliance_documents(job_id);
create index if not exists idx_compliance_docs_company on compliance_documents(company_id);

alter table compliance_documents enable row level security;

create policy "company members can manage compliance docs"
  on compliance_documents for all to authenticated
  using (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
  with check (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
