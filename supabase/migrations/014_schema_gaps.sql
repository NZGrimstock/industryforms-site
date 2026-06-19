-- Fix 1: price_list_items — add category for grouping/filtering
alter table price_list_items add column if not exists category text;

-- Fix 2: invoices — add explicit invoice_date (separate from created_at which is system time)
alter table invoices add column if not exists invoice_date date;

-- Backfill invoice_date from created_at for any existing rows
update invoices set invoice_date = created_at::date where invoice_date is null;

-- Fix 3: job_materials — add sell_price as alias column (code uses both names; normalise to unit_price)
-- The schema already has unit_price; the insert bug in jobs/client.tsx will be fixed in code.
-- No schema change needed for this one.

-- Fix 4: Add invoice_date index for reporting/sorting
create index if not exists idx_invoices_invoice_date on invoices(company_id, invoice_date);

-- Grant access to new columns (covered by existing table grants, but be explicit)
grant all on table price_list_items to anon, authenticated, service_role;
grant all on table invoices to anon, authenticated, service_role;
