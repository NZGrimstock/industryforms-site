-- PowerSync provisioning
-- ----------------------------------------------------------------------------
-- PowerSync sync rules scope data per company using single-table queries, so
-- every synced table must carry company_id. Six child tables only reference
-- their parent, so we denormalise company_id onto them (backfilled + kept in
-- sync by a trigger, so application insert code needs no changes), then create
-- the logical-replication publication PowerSync connects to.
-- ----------------------------------------------------------------------------

-- 1. Add company_id to child tables that lack it -----------------------------
alter table customer_sites     add column if not exists company_id uuid references companies(id) on delete cascade;
alter table job_visits         add column if not exists company_id uuid references companies(id) on delete cascade;
alter table job_notes          add column if not exists company_id uuid references companies(id) on delete cascade;
alter table quote_sections     add column if not exists company_id uuid references companies(id) on delete cascade;
alter table quote_line_items   add column if not exists company_id uuid references companies(id) on delete cascade;
alter table invoice_line_items add column if not exists company_id uuid references companies(id) on delete cascade;
alter table job_photos         add column if not exists company_id uuid references companies(id) on delete cascade;

-- 2. Backfill from parent ----------------------------------------------------
update customer_sites cs     set company_id = c.company_id from customers c where cs.customer_id = c.id and cs.company_id is null;
update job_visits jv         set company_id = j.company_id from jobs j      where jv.job_id = j.id      and jv.company_id is null;
update job_notes jn          set company_id = j.company_id from jobs j      where jn.job_id = j.id      and jn.company_id is null;
update quote_sections qs     set company_id = q.company_id from quotes q    where qs.quote_id = q.id    and qs.company_id is null;
update quote_line_items ql   set company_id = q.company_id from quotes q    where ql.quote_id = q.id    and ql.company_id is null;
update invoice_line_items il set company_id = i.company_id from invoices i  where il.invoice_id = i.id  and il.company_id is null;
update job_photos jp         set company_id = j.company_id from jobs j      where jp.job_id = j.id      and jp.company_id is null;

-- 3. Trigger to auto-populate company_id from parent on insert/update --------
--    TG_ARGV[0] = parent table, TG_ARGV[1] = local FK column.
create or replace function set_company_id_from_parent() returns trigger as $$
declare
  cid uuid;
begin
  if NEW.company_id is null then
    execute format('select company_id from %I where id = $1', TG_ARGV[0])
      into cid using (row_to_json(NEW) ->> TG_ARGV[1])::uuid;
    NEW.company_id := cid;
  end if;
  return NEW;
end;
$$ language plpgsql;

drop trigger if exists set_company_id on customer_sites;
create trigger set_company_id before insert or update on customer_sites
  for each row execute function set_company_id_from_parent('customers', 'customer_id');

drop trigger if exists set_company_id on job_visits;
create trigger set_company_id before insert or update on job_visits
  for each row execute function set_company_id_from_parent('jobs', 'job_id');

drop trigger if exists set_company_id on job_notes;
create trigger set_company_id before insert or update on job_notes
  for each row execute function set_company_id_from_parent('jobs', 'job_id');

drop trigger if exists set_company_id on quote_sections;
create trigger set_company_id before insert or update on quote_sections
  for each row execute function set_company_id_from_parent('quotes', 'quote_id');

drop trigger if exists set_company_id on quote_line_items;
create trigger set_company_id before insert or update on quote_line_items
  for each row execute function set_company_id_from_parent('quotes', 'quote_id');

drop trigger if exists set_company_id on invoice_line_items;
create trigger set_company_id before insert or update on invoice_line_items
  for each row execute function set_company_id_from_parent('invoices', 'invoice_id');

drop trigger if exists set_company_id on job_photos;
create trigger set_company_id before insert or update on job_photos
  for each row execute function set_company_id_from_parent('jobs', 'job_id');

-- 4. Replica identity FULL so PowerSync replicates updates/deletes correctly --
do $$
declare t text;
begin
  foreach t in array array[
    'jobs','customers','customer_sites','job_visits','job_notes','timesheets',
    'job_materials','form_templates','form_submissions','price_list_items',
    'travel_logs','quotes','quote_sections','quote_line_items','invoices',
    'invoice_line_items','job_photos'
  ] loop
    execute format('alter table %I replica identity full', t);
  end loop;
end $$;

-- 5. Logical replication publication PowerSync subscribes to ------------------
drop publication if exists powersync;
create publication powersync for table
  jobs, customers, customer_sites, job_visits, job_notes, timesheets,
  job_materials, form_templates, form_submissions, price_list_items,
  travel_logs, quotes, quote_sections, quote_line_items, invoices,
  invoice_line_items, job_photos;
