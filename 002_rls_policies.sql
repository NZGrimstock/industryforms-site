-- ============================================================================
-- TradeHub — Row Level Security Policies
-- ============================================================================
-- Strategy: every business table has a company_id (directly or via parent).
-- A helper function resolves the current user's company_id from their
-- profile row, and policies check rows against it. Owners/admins get full
-- access within their company; staff get read access + limited write access
-- (e.g. they can log timesheets and add job notes/photos, but not edit
-- invoices or company settings). Adjust the staff restrictions as the actual
-- UI permission model firms up — these are sensible defaults, not final.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper functions
-- ----------------------------------------------------------------------------
create or replace function current_company_id()
returns uuid as $$
  select company_id from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function current_user_role()
returns user_role as $$
  select role from profiles where id = auth.uid();
$$ language sql stable security definer;

create or replace function is_admin_or_owner()
returns boolean as $$
  select current_user_role() in ('owner', 'admin');
$$ language sql stable security definer;

-- ----------------------------------------------------------------------------
-- Enable RLS on all tables
-- ----------------------------------------------------------------------------
alter table companies enable row level security;
alter table profiles enable row level security;
alter table customers enable row level security;
alter table customer_sites enable row level security;
alter table price_list_items enable row level security;
alter table kits enable row level security;
alter table kit_items enable row level security;
alter table quotes enable row level security;
alter table quote_sections enable row level security;
alter table quote_line_items enable row level security;
alter table jobs enable row level security;
alter table job_visits enable row level security;
alter table job_notes enable row level security;
alter table job_photos enable row level security;
alter table timesheets enable row level security;
alter table invoices enable row level security;
alter table invoice_line_items enable row level security;
alter table payments enable row level security;
alter table reminders enable row level security;

-- ----------------------------------------------------------------------------
-- COMPANIES — a user can only see/update their own company
-- ----------------------------------------------------------------------------
create policy "select own company" on companies
  for select using (id = current_company_id());

create policy "update own company if admin" on companies
  for update using (id = current_company_id() and is_admin_or_owner());

-- Note: company creation happens via a signup server-side function (security
-- definer), not direct insert, so no insert policy here.

-- ----------------------------------------------------------------------------
-- PROFILES
-- ----------------------------------------------------------------------------
create policy "select profiles in own company" on profiles
  for select using (company_id = current_company_id());

create policy "users update own profile" on profiles
  for update using (id = auth.uid());

create policy "admins update any profile in company" on profiles
  for update using (company_id = current_company_id() and is_admin_or_owner());

create policy "admins insert profiles in company" on profiles
  for insert with check (company_id = current_company_id() and is_admin_or_owner());

-- ----------------------------------------------------------------------------
-- CUSTOMERS & SITES
-- ----------------------------------------------------------------------------
create policy "company members select customers" on customers
  for select using (company_id = current_company_id());
create policy "company members write customers" on customers
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "company members select sites" on customer_sites
  for select using (
    customer_id in (select id from customers where company_id = current_company_id())
  );
create policy "company members write sites" on customer_sites
  for all using (
    customer_id in (select id from customers where company_id = current_company_id())
  ) with check (
    customer_id in (select id from customers where company_id = current_company_id())
  );

-- ----------------------------------------------------------------------------
-- PRICE LIST / KITS
-- ----------------------------------------------------------------------------
create policy "company members select price list" on price_list_items
  for select using (company_id = current_company_id());
create policy "admins write price list" on price_list_items
  for all using (company_id = current_company_id() and is_admin_or_owner())
  with check (company_id = current_company_id() and is_admin_or_owner());

create policy "company members select kits" on kits
  for select using (company_id = current_company_id());
create policy "admins write kits" on kits
  for all using (company_id = current_company_id() and is_admin_or_owner())
  with check (company_id = current_company_id() and is_admin_or_owner());

create policy "company members select kit items" on kit_items
  for select using (kit_id in (select id from kits where company_id = current_company_id()));
create policy "admins write kit items" on kit_items
  for all using (kit_id in (select id from kits where company_id = current_company_id() and is_admin_or_owner()))
  with check (kit_id in (select id from kits where company_id = current_company_id() and is_admin_or_owner()));

-- ----------------------------------------------------------------------------
-- QUOTES (staff can create/edit; public_token access handled separately
-- via a server-side function for the customer-facing view/accept page —
-- NOT via RLS, since the customer has no auth.uid())
-- ----------------------------------------------------------------------------
create policy "company members select quotes" on quotes
  for select using (company_id = current_company_id());
create policy "company members write quotes" on quotes
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "company members select quote sections" on quote_sections
  for select using (quote_id in (select id from quotes where company_id = current_company_id()));
create policy "company members write quote sections" on quote_sections
  for all using (quote_id in (select id from quotes where company_id = current_company_id()))
  with check (quote_id in (select id from quotes where company_id = current_company_id()));

create policy "company members select quote line items" on quote_line_items
  for select using (quote_id in (select id from quotes where company_id = current_company_id()));
create policy "company members write quote line items" on quote_line_items
  for all using (quote_id in (select id from quotes where company_id = current_company_id()))
  with check (quote_id in (select id from quotes where company_id = current_company_id()));

-- ----------------------------------------------------------------------------
-- JOBS, VISITS, NOTES, PHOTOS
-- ----------------------------------------------------------------------------
create policy "company members select jobs" on jobs
  for select using (company_id = current_company_id());
create policy "company members write jobs" on jobs
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());

create policy "company members select visits" on job_visits
  for select using (job_id in (select id from jobs where company_id = current_company_id()));
create policy "company members write visits" on job_visits
  for all using (job_id in (select id from jobs where company_id = current_company_id()))
  with check (job_id in (select id from jobs where company_id = current_company_id()));

create policy "company members select job notes" on job_notes
  for select using (job_id in (select id from jobs where company_id = current_company_id()));
create policy "company members insert job notes" on job_notes
  for insert with check (job_id in (select id from jobs where company_id = current_company_id()));

create policy "company members select job photos" on job_photos
  for select using (job_id in (select id from jobs where company_id = current_company_id()));
create policy "company members insert job photos" on job_photos
  for insert with check (job_id in (select id from jobs where company_id = current_company_id()));

-- ----------------------------------------------------------------------------
-- TIMESHEETS — staff can manage their own entries; admins manage all
-- ----------------------------------------------------------------------------
create policy "company members select timesheets" on timesheets
  for select using (company_id = current_company_id());
create policy "staff write own timesheets" on timesheets
  for all using (company_id = current_company_id() and profile_id = auth.uid())
  with check (company_id = current_company_id() and profile_id = auth.uid());
create policy "admins write any timesheet" on timesheets
  for all using (company_id = current_company_id() and is_admin_or_owner())
  with check (company_id = current_company_id() and is_admin_or_owner());

-- ----------------------------------------------------------------------------
-- INVOICES, LINE ITEMS, PAYMENTS — admin/owner only for write (staff read-only;
-- adjust if you want field staff marking jobs ready-to-invoice)
-- ----------------------------------------------------------------------------
create policy "company members select invoices" on invoices
  for select using (company_id = current_company_id());
create policy "admins write invoices" on invoices
  for all using (company_id = current_company_id() and is_admin_or_owner())
  with check (company_id = current_company_id() and is_admin_or_owner());

create policy "company members select invoice line items" on invoice_line_items
  for select using (invoice_id in (select id from invoices where company_id = current_company_id()));
create policy "admins write invoice line items" on invoice_line_items
  for all using (invoice_id in (select id from invoices where company_id = current_company_id() and is_admin_or_owner()))
  with check (invoice_id in (select id from invoices where company_id = current_company_id() and is_admin_or_owner()));

create policy "company members select payments" on payments
  for select using (invoice_id in (select id from invoices where company_id = current_company_id()));
create policy "admins write payments" on payments
  for all using (invoice_id in (select id from invoices where company_id = current_company_id() and is_admin_or_owner()))
  with check (invoice_id in (select id from invoices where company_id = current_company_id() and is_admin_or_owner()));

-- ----------------------------------------------------------------------------
-- REMINDERS
-- ----------------------------------------------------------------------------
create policy "company members select reminders" on reminders
  for select using (company_id = current_company_id());
create policy "admins write reminders" on reminders
  for all using (company_id = current_company_id() and is_admin_or_owner())
  with check (company_id = current_company_id() and is_admin_or_owner());
