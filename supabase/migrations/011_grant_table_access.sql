-- Grant PostgREST + service role access to all application tables.
-- Supabase local setup grants service_role before migrations run, so tables
-- created in migrations don't inherit the grant automatically.

grant usage on schema public to anon, authenticated, service_role;

grant all on table companies             to anon, authenticated, service_role;
grant all on table profiles              to anon, authenticated, service_role;
grant all on table customers             to anon, authenticated, service_role;
grant all on table customer_sites        to anon, authenticated, service_role;
grant all on table price_list_items      to anon, authenticated, service_role;
grant all on table kits                  to anon, authenticated, service_role;
grant all on table kit_items             to anon, authenticated, service_role;
grant all on table quotes                to anon, authenticated, service_role;
grant all on table quote_sections        to anon, authenticated, service_role;
grant all on table quote_line_items      to anon, authenticated, service_role;
grant all on table jobs                  to anon, authenticated, service_role;
grant all on table job_visits            to anon, authenticated, service_role;
grant all on table job_notes             to anon, authenticated, service_role;
grant all on table job_photos            to anon, authenticated, service_role;
grant all on table job_materials         to anon, authenticated, service_role;
grant all on table timesheets            to anon, authenticated, service_role;
grant all on table invoices              to anon, authenticated, service_role;
grant all on table invoice_line_items    to anon, authenticated, service_role;
grant all on table payments              to anon, authenticated, service_role;
grant all on table reminders             to anon, authenticated, service_role;
grant all on table enquiries             to anon, authenticated, service_role;
grant all on table todos                 to anon, authenticated, service_role;
grant all on table form_templates        to anon, authenticated, service_role;
grant all on table form_submissions      to anon, authenticated, service_role;
grant all on table progress_claims       to anon, authenticated, service_role;

grant usage on all sequences in schema public to anon, authenticated, service_role;

-- Ensure future tables also get these grants automatically
alter default privileges in schema public
  grant all on tables to anon, authenticated, service_role;

alter default privileges in schema public
  grant usage on sequences to anon, authenticated, service_role;
