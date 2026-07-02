-- Test mode: pre-populate demo data for onboarding/sales; track the inserted IDs
-- so cleanup is precise (no accidental deletion of real records).
alter table companies
  add column if not exists test_mode boolean not null default false,
  add column if not exists test_data_ids jsonb not null default '{}'::jsonb;
