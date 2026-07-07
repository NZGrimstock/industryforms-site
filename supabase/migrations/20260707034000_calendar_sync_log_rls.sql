-- calendar_sync_log was created (017_google_calendar.sql) without RLS. Only
-- service-role code touches it today so there's no active exploit path, but
-- it's a defense-in-depth gap: any future client-side query would leak
-- calendar sync data across companies. Match the standard company-scoped
-- pattern used everywhere else.
alter table calendar_sync_log enable row level security;

create policy "company members select calendar sync log" on calendar_sync_log
  for select using (company_id = current_company_id());

create policy "company members write calendar sync log" on calendar_sync_log
  for all using (company_id = current_company_id())
  with check (company_id = current_company_id());
