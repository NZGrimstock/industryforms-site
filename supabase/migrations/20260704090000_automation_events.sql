-- Sprint E: automation event log. Every notify() call (booking confirmations,
-- reminders, win-back, review requests) writes one row here so admins can see
-- what fired, what's dark (SMS pending Twilio), and what failed.
create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  booking_id uuid references bookings(id) on delete cascade,
  event_type text not null,
  channel text not null,                 -- email | sms
  scheduled_for timestamptz,
  sent_at timestamptz,
  status text not null default 'pending',-- pending | sent | skipped_sms_dark | failed
  error text,
  created_at timestamptz not null default now()
);
create index if not exists automation_events_company_idx on automation_events(company_id, created_at desc);
create index if not exists automation_events_booking_idx on automation_events(booking_id, event_type);

alter table automation_events enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where tablename = 'automation_events' and policyname = 'company members select automation_events') then
    create policy "company members select automation_events" on automation_events
      for select using (company_id = current_company_id());
  end if;
end $$;
