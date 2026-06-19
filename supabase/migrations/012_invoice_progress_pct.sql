alter table invoices
  add column if not exists progress_pct numeric(5,4);
