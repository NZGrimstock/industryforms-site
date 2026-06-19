-- Enquiries: inbound lead capture before a customer exists
create type enquiry_status as enum ('new', 'contacted', 'quoted', 'won', 'lost');
create type enquiry_source as enum ('website', 'phone', 'email', 'referral', 'walk_in', 'other');

create table enquiries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  address text,
  description text,
  source enquiry_source not null default 'other',
  status enquiry_status not null default 'new',
  assigned_to uuid references profiles(id) on delete set null,
  converted_to_quote_id uuid references quotes(id) on delete set null,
  converted_to_job_id uuid references jobs(id) on delete set null,
  notes text,
  follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index enquiries_company_id_idx on enquiries(company_id);
create index enquiries_status_idx on enquiries(status);
create trigger set_enquiries_updated_at before update on enquiries
  for each row execute function set_updated_at();

-- To-Do tasks
create type todo_priority as enum ('low', 'medium', 'high', 'urgent');
create type todo_status as enum ('pending', 'in_progress', 'done');

create table todos (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  title text not null,
  description text,
  priority todo_priority not null default 'medium',
  status todo_status not null default 'pending',
  assigned_to uuid references profiles(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,
  due_date date,
  job_id uuid references jobs(id) on delete set null,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index todos_company_id_idx on todos(company_id);
create index todos_assigned_to_idx on todos(assigned_to);
create trigger set_todos_updated_at before update on todos
  for each row execute function set_updated_at();

-- RLS for enquiries
alter table enquiries enable row level security;
create policy "company members can view enquiries" on enquiries
  for select using (company_id = current_company_id());
create policy "company members can insert enquiries" on enquiries
  for insert with check (company_id = current_company_id());
create policy "admins can update enquiries" on enquiries
  for update using (company_id = current_company_id());
create policy "admins can delete enquiries" on enquiries
  for delete using (company_id = current_company_id() and is_admin_or_owner());

-- RLS for todos
alter table todos enable row level security;
create policy "company members can view todos" on todos
  for select using (company_id = current_company_id());
create policy "company members can insert todos" on todos
  for insert with check (company_id = current_company_id());
create policy "company members can update todos" on todos
  for update using (company_id = current_company_id());
create policy "admins can delete todos" on todos
  for delete using (company_id = current_company_id() and is_admin_or_owner());
