-- Track the last automated payment reminder per invoice so the dunning cron
-- throttles (one reminder per invoice per ~week) instead of texting/emailing
-- the customer on every run.
alter table invoices add column if not exists last_reminder_at timestamptz;
