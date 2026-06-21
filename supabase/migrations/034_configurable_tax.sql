-- Configurable tax for NZ + AU: multiple named tax rates + per-line tax rate so
-- lines can be standard-rated (NZ GST 15% / AU GST 10%), zero-rated, or GST-free.
--
-- Rates are stored as fractions (0.15, 0.10, 0). A NULL line tax_rate means "use
-- the company default rate" (companies.default_gst_rate), so all existing rows
-- keep their current behaviour with no backfill needed.

create table if not exists tax_rates (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  name       text not null,                 -- 'GST', 'No GST', 'GST Free', 'Zero-rated'
  rate       numeric(6,4) not null default 0,
  is_default boolean not null default false,
  is_active  boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists tax_rates_company_idx on tax_rates(company_id);

alter table tax_rates enable row level security;
create policy "members select tax_rates" on tax_rates
  for select using (company_id = current_company_id());
create policy "admins write tax_rates" on tax_rates
  for all using (company_id = current_company_id() and is_admin_or_owner())
  with check (company_id = current_company_id() and is_admin_or_owner());

-- Per-line tax rate (fraction). NULL → company default rate.
alter table quote_line_items   add column if not exists tax_rate numeric(6,4);
alter table invoice_line_items add column if not exists tax_rate numeric(6,4);

-- How entered prices are treated company-wide (display/quoting convention).
alter table companies add column if not exists prices_include_tax boolean not null default false;
