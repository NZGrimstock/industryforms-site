-- ============================================================================
-- TradeHub (working name) — Initial Schema
-- Target: Supabase (Postgres + Auth + Storage + RLS)
-- ============================================================================
-- Design principles:
-- 1. Multi-tenant via `company_id` on every business table + RLS enforcement.
-- 2. Normalize line items (quote/invoice) against a price list, not free text,
--    so margin/profit reporting actually works (Tradify weakness).
-- 3. Separate `jobs` from `job_visits` so one job can have many scheduled
--    visits without duplicating job-level data (Tradify scheduling gap).
-- 4. Every customer-facing document (quote/invoice) gets a public_token for
--    tokenless link access (view/accept quote, pay invoice).
-- 5. Leave clean integration points (external_id, synced_at) for future
--    Xero/MYOB sync without restructuring later.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- EXTENSIONS
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- ENUMS
-- ----------------------------------------------------------------------------
create type user_role as enum ('owner', 'admin', 'staff');
create type customer_type as enum ('residential', 'commercial');
create type quote_status as enum ('draft', 'sent', 'accepted', 'declined', 'expired');
create type job_status as enum ('unscheduled', 'scheduled', 'in_progress', 'on_hold', 'completed', 'cancelled');
create type visit_status as enum ('scheduled', 'in_progress', 'completed', 'cancelled', 'no_show');
create type invoice_status as enum ('draft', 'sent', 'partially_paid', 'paid', 'overdue', 'void');
create type line_item_type as enum ('labour', 'material', 'misc', 'section_header');
create type payment_method as enum ('stripe', 'bank_transfer', 'cash', 'cheque', 'other');

-- ----------------------------------------------------------------------------
-- COMPANIES (tenants)
-- ----------------------------------------------------------------------------
create table companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  trade_type text, -- e.g. 'electrician', 'plumber', 'builder' — free text, not enum (avoid limiting niches)
  country text not null default 'NZ', -- 'NZ' | 'AU'
  gst_number text,
  default_gst_rate numeric(5,4) not null default 0.15, -- 0.15 NZ, 0.10 AU — overridable per company
  logo_url text,
  brand_color text,
  email text,
  phone text,
  address text,

  -- billing for THIS app's own subscription (not the trade's customer invoices)
  stripe_customer_id text,
  subscription_plan text not null default 'trial', -- 'trial' | 'solo' | 'team' | 'pro'
  subscription_status text not null default 'trialing',
  trial_ends_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- PROFILES (staff/users — extends Supabase auth.users)
-- ----------------------------------------------------------------------------
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  full_name text not null,
  email text not null,
  phone text,
  role user_role not null default 'staff',
  hourly_cost_rate numeric(10,2), -- what they cost the business (for job costing)
  hourly_bill_rate numeric(10,2), -- what gets charged out by default
  is_active boolean not null default true,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_profiles_company on profiles(company_id);

-- ----------------------------------------------------------------------------
-- CUSTOMERS (the trade business's own clients)
-- ----------------------------------------------------------------------------
create table customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type customer_type not null default 'residential',
  name text not null, -- person or business name
  contact_person text, -- if commercial, who to deal with
  email text,
  phone text,
  billing_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_customers_company on customers(company_id);
create index idx_customers_name_search on customers using gin (to_tsvector('english', name));

-- a customer can have multiple service addresses (job sites)
create table customer_sites (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers(id) on delete cascade,
  label text, -- e.g. 'Main house', 'Rental - Queen St'
  address text not null,
  lat numeric(9,6),
  lng numeric(9,6),
  access_notes text, -- gate code, dog, parking notes — genuinely useful field crews want
  created_at timestamptz not null default now()
);
create index idx_customer_sites_customer on customer_sites(customer_id);

-- ----------------------------------------------------------------------------
-- PRICE LIST (materials, labour rates, services)
-- ----------------------------------------------------------------------------
create table price_list_items (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  type line_item_type not null default 'material',
  code text, -- internal SKU/code
  name text not null,
  description text,
  unit text not null default 'each', -- 'each', 'hour', 'm', 'm2', 'litre' etc.
  cost_price numeric(10,2) not null default 0, -- what it costs the business
  sell_price numeric(10,2) not null default 0, -- default charge-out price
  default_markup_pct numeric(6,2), -- convenience field, derived but stored for editing UX
  supplier_name text,
  quantity_on_hand numeric(10,2), -- nullable = not tracked; real inventory tracking (Tradify weak spot)
  low_stock_threshold numeric(10,2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_price_list_company on price_list_items(company_id);

-- Kits: reusable bundles of price list items (e.g. "Install double powerpoint")
create table kits (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name text not null,
  description text,
  created_at timestamptz not null default now()
);
create index idx_kits_company on kits(company_id);

create table kit_items (
  id uuid primary key default gen_random_uuid(),
  kit_id uuid not null references kits(id) on delete cascade,
  price_list_item_id uuid not null references price_list_items(id) on delete cascade,
  quantity numeric(10,2) not null default 1,
  sort_order integer not null default 0
);
create index idx_kit_items_kit on kit_items(kit_id);

-- ----------------------------------------------------------------------------
-- QUOTES
-- ----------------------------------------------------------------------------
create table quotes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  site_id uuid references customer_sites(id) on delete set null,
  created_by uuid references profiles(id) on delete set null,

  quote_number text not null, -- human readable, e.g. 'Q-1042'
  title text not null,
  status quote_status not null default 'draft',

  subtotal numeric(12,2) not null default 0,
  gst_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,

  notes text, -- internal notes
  customer_message text, -- shown to customer on the quote
  terms text,

  public_token uuid not null default gen_random_uuid(), -- for tokenless customer view/accept link
  sent_at timestamptz,
  viewed_at timestamptz, -- "X-Ray vision" equivalent
  expires_at timestamptz,
  accepted_at timestamptz,
  declined_at timestamptz,

  converted_to_job_id uuid, -- fk added after jobs table created

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, quote_number)
);
create index idx_quotes_company on quotes(company_id);
create index idx_quotes_customer on quotes(customer_id);
create index idx_quotes_status on quotes(company_id, status);
create unique index idx_quotes_public_token on quotes(public_token);

-- Quotes can have optional sections, each with line items (Tradify "Quote Options")
create table quote_sections (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  title text not null,
  is_optional boolean not null default false, -- customer can opt in/out of this section
  customer_selected boolean, -- null until customer responds, then true/false
  sort_order integer not null default 0
);
create index idx_quote_sections_quote on quote_sections(quote_id);

create table quote_line_items (
  id uuid primary key default gen_random_uuid(),
  quote_id uuid not null references quotes(id) on delete cascade,
  section_id uuid references quote_sections(id) on delete cascade,
  price_list_item_id uuid references price_list_items(id) on delete set null,

  type line_item_type not null default 'material',
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'each',
  unit_cost numeric(10,2) not null default 0,
  unit_price numeric(10,2) not null default 0,
  line_total numeric(12,2) not null default 0, -- quantity * unit_price, stored for history even if price list changes later

  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_quote_line_items_quote on quote_line_items(quote_id);

-- ----------------------------------------------------------------------------
-- JOBS
-- ----------------------------------------------------------------------------
create table jobs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  site_id uuid references customer_sites(id) on delete set null,
  quote_id uuid references quotes(id) on delete set null, -- null if job created without a quote

  job_number text not null,
  title text not null,
  description text,
  status job_status not null default 'unscheduled',

  -- recurring job support (Tradify has this but reviewers wanted more flexibility)
  is_recurring boolean not null default false,
  recurrence_rule text, -- iCal RRULE string — standard, extensible, not a bespoke format

  assigned_to uuid references profiles(id) on delete set null, -- primary assignee; visits can override
  tags text[], -- custom statuses/labels, freeform (Tradify weakness: "limited customization")

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, job_number)
);
create index idx_jobs_company on jobs(company_id);
create index idx_jobs_customer on jobs(customer_id);
create index idx_jobs_status on jobs(company_id, status);
create index idx_jobs_assigned on jobs(assigned_to);

alter table quotes add constraint fk_quotes_converted_job
  foreign key (converted_to_job_id) references jobs(id) on delete set null;

-- A job can have multiple scheduled visits (key structural improvement over
-- treating "job" and "appointment" as the same thing)
create table job_visits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  assigned_to uuid references profiles(id) on delete set null,

  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  actual_start timestamptz,
  actual_end timestamptz,
  status visit_status not null default 'scheduled',

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_job_visits_job on job_visits(job_id);
create index idx_job_visits_assigned on job_visits(assigned_to, scheduled_start);
create index idx_job_visits_schedule on job_visits(scheduled_start, scheduled_end);

create table job_notes (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  author_id uuid references profiles(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);
create index idx_job_notes_job on job_notes(job_id);

create table job_photos (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references jobs(id) on delete cascade,
  uploaded_by uuid references profiles(id) on delete set null,
  storage_path text not null, -- Supabase Storage object path
  caption text,
  taken_at timestamptz not null default now()
);
create index idx_job_photos_job on job_photos(job_id);

-- ----------------------------------------------------------------------------
-- TIMESHEETS
-- ----------------------------------------------------------------------------
create table timesheets (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  job_id uuid references jobs(id) on delete set null,
  visit_id uuid references job_visits(id) on delete set null,
  profile_id uuid not null references profiles(id) on delete cascade,

  started_at timestamptz not null,
  ended_at timestamptz,
  break_minutes integer not null default 0,
  bill_rate numeric(10,2), -- snapshot of rate at time of entry
  cost_rate numeric(10,2),
  notes text,
  is_billable boolean not null default true,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index idx_timesheets_company on timesheets(company_id);
create index idx_timesheets_job on timesheets(job_id);
create index idx_timesheets_profile on timesheets(profile_id, started_at);

-- ----------------------------------------------------------------------------
-- INVOICES
-- ----------------------------------------------------------------------------
create table invoices (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid not null references customers(id) on delete restrict,
  job_id uuid references jobs(id) on delete set null,

  invoice_number text not null,
  status invoice_status not null default 'draft',

  -- progress invoicing support: links sibling invoices on the same job
  is_progress_invoice boolean not null default false,
  progress_sequence integer, -- 1, 2, 3... for deposit/progress/final

  subtotal numeric(12,2) not null default 0,
  gst_amount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  amount_paid numeric(12,2) not null default 0,

  notes text,
  terms text,
  due_date date,

  public_token uuid not null default gen_random_uuid(),
  sent_at timestamptz,
  viewed_at timestamptz,
  paid_at timestamptz,

  -- accounting sync integration points (Xero/MYOB) — not used yet, but the
  -- shape avoids a painful migration later
  external_system text, -- 'xero' | 'myob' | null
  external_id text,
  external_synced_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  unique (company_id, invoice_number)
);
create index idx_invoices_company on invoices(company_id);
create index idx_invoices_customer on invoices(customer_id);
create index idx_invoices_status on invoices(company_id, status);
create unique index idx_invoices_public_token on invoices(public_token);

create table invoice_line_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  price_list_item_id uuid references price_list_items(id) on delete set null,
  timesheet_id uuid references timesheets(id) on delete set null, -- if generated from timesheet

  type line_item_type not null default 'material',
  description text not null,
  quantity numeric(10,2) not null default 1,
  unit text not null default 'each',
  unit_price numeric(10,2) not null default 0,
  line_total numeric(12,2) not null default 0,

  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index idx_invoice_line_items_invoice on invoice_line_items(invoice_id);

create table payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  amount numeric(12,2) not null,
  method payment_method not null default 'stripe',
  stripe_payment_intent_id text,
  paid_at timestamptz not null default now(),
  notes text,
  created_at timestamptz not null default now()
);
create index idx_payments_invoice on payments(invoice_id);

-- ----------------------------------------------------------------------------
-- REMINDERS (quote follow-ups, invoice overdue nudges)
-- ----------------------------------------------------------------------------
create table reminders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  quote_id uuid references quotes(id) on delete cascade,
  invoice_id uuid references invoices(id) on delete cascade,
  type text not null, -- 'quote_follow_up' | 'invoice_overdue' | 'appointment_reminder'
  channel text not null default 'email', -- 'email' | 'sms'
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),

  check (quote_id is not null or invoice_id is not null)
);
create index idx_reminders_pending on reminders(scheduled_for) where sent_at is null;

-- ----------------------------------------------------------------------------
-- updated_at trigger helper (applied selectively below)
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger trg_companies_updated_at before update on companies for each row execute function set_updated_at();
create trigger trg_profiles_updated_at before update on profiles for each row execute function set_updated_at();
create trigger trg_customers_updated_at before update on customers for each row execute function set_updated_at();
create trigger trg_price_list_updated_at before update on price_list_items for each row execute function set_updated_at();
create trigger trg_quotes_updated_at before update on quotes for each row execute function set_updated_at();
create trigger trg_jobs_updated_at before update on jobs for each row execute function set_updated_at();
create trigger trg_job_visits_updated_at before update on job_visits for each row execute function set_updated_at();
create trigger trg_timesheets_updated_at before update on timesheets for each row execute function set_updated_at();
create trigger trg_invoices_updated_at before update on invoices for each row execute function set_updated_at();
