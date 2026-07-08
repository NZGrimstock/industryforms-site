-- Codex build audit marker (2026-07-08): production billing add-ons + SMS usage ledger.
-- This keeps Projects/SMS add-ons Stripe-driven and gives every billable outbound SMS
-- an auditable server-side row before/after Stripe meter reporting.

alter table public.companies
  add column if not exists stripe_subscription_id text;

create table if not exists public.sms_usage_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  twilio_sid text unique,
  to_number text,
  units integer not null default 1 check (units > 0),
  status text not null default 'sent',
  related_type text,
  related_id uuid,
  stripe_meter_event_name text,
  stripe_identifier text unique,
  stripe_reported_at timestamptz,
  stripe_error text,
  created_at timestamptz not null default now()
);

create index if not exists sms_usage_events_company_created_idx
  on public.sms_usage_events(company_id, created_at desc);

alter table public.sms_usage_events enable row level security;

revoke all on table public.sms_usage_events from public, anon, authenticated;
grant all on table public.sms_usage_events to service_role;
