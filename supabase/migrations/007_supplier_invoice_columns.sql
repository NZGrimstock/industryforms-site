-- Supplier invoice tracking on job materials
alter table job_materials
  add column if not exists supplier text,
  add column if not exists supplier_invoice_number text;
