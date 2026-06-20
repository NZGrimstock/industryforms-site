-- Supplier bills (accounts payable) — what the business owes suppliers.

create table if not exists bills (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  purchase_order_id uuid references purchase_orders(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  reference text,                          -- supplier's invoice / bill number
  status text not null default 'unpaid',   -- unpaid | partially_paid | paid
  bill_date date not null default current_date,
  due_date date,
  subtotal numeric(12,2) not null default 0,
  gst_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,
  notes text,
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bills_company_idx on bills(company_id);
create index if not exists bills_supplier_idx on bills(supplier_id);
create index if not exists bills_job_idx on bills(job_id);

alter table bills enable row level security;
create policy "company members manage bills" on bills
  for all using (company_id = current_company_id()) with check (company_id = current_company_id());
grant all on table bills to anon, authenticated, service_role;
