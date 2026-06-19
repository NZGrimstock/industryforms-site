-- Job invitations: structured job invite sent from contractor to subcontractor.
-- If the subcontractor is also on IndustryForms, subcontractor_company_id is populated
-- and a job_link is created on acceptance (two-way sync).

create table job_invitations (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  contractor_company_id uuid not null references companies(id),
  invited_by uuid not null references profiles(id),
  subcontractor_email text not null,
  -- Populated at send-time if the email matches a registered IndustryForms company
  subcontractor_company_id uuid references companies(id),
  title text not null,
  description text,
  project_address text,
  due_date date,
  agreed_price numeric(12,2),
  token text not null unique default encode(gen_random_bytes(32), 'hex'),
  status text not null default 'pending', -- pending | accepted | declined | cancelled
  accepted_at timestamptz,
  declined_at timestamptz,
  created_at timestamptz not null default now()
);

create index idx_job_invitations_job    on job_invitations(job_id);
create index idx_job_invitations_token  on job_invitations(token);
create index idx_job_invitations_sub    on job_invitations(subcontractor_company_id)
  where subcontractor_company_id is not null;

alter table job_invitations enable row level security;

-- Contractor company members manage their outgoing invitations
create policy "contractors manage invitations" on job_invitations
  for all using (
    contractor_company_id in (
      select company_id from profiles where id = auth.uid()
    )
  );

-- Subcontractor company members see invitations directed at them
create policy "subcontractors see their invitations" on job_invitations
  for select using (
    subcontractor_company_id in (
      select company_id from profiles where id = auth.uid()
    )
  );

-- Subcontractors can update status on invitations directed at them (accept/decline)
create policy "subcontractors update their invitations" on job_invitations
  for update using (
    subcontractor_company_id in (
      select company_id from profiles where id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- Job links: created when subcontractor accepts and is on the platform.
-- Connects contractor_job_id ↔ subcontractor_job_id for live status visibility.
-- ---------------------------------------------------------------------------
create table job_links (
  id uuid primary key default gen_random_uuid(),
  invitation_id uuid references job_invitations(id) on delete set null,
  contractor_job_id uuid not null references jobs(id) on delete cascade,
  subcontractor_job_id uuid not null references jobs(id) on delete cascade,
  contractor_company_id uuid not null references companies(id),
  subcontractor_company_id uuid not null references companies(id),
  created_at timestamptz not null default now(),
  unique(contractor_job_id, subcontractor_job_id)
);

alter table job_links enable row level security;

-- Both parties can read the link (they need to see the other side's status)
create policy "linked job parties can view" on job_links
  for select using (
    contractor_company_id in (select company_id from profiles where id = auth.uid())
    or subcontractor_company_id in (select company_id from profiles where id = auth.uid())
  );

-- Only the system (service role via API) inserts links on acceptance
create policy "service role inserts links" on job_links
  for insert with check (true);
