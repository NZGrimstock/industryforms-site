-- Enable RLS on admin_audit_log (was fully exposed to anon/authenticated)
alter table public.admin_audit_log enable row level security;

-- Only super admins can read audit logs
create policy "Super admins can read audit log"
  on public.admin_audit_log for select
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_super_admin = true
    )
  );

-- Only super admins can insert audit log entries (service_role bypasses RLS)
create policy "Super admins can insert audit log"
  on public.admin_audit_log for insert
  to authenticated
  with check (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and is_super_admin = true
    )
  );

-- Revoke direct table access from anon/authenticated — service_role retains access
revoke all on table public.admin_audit_log from anon;
revoke all on table public.admin_audit_log from authenticated;
grant select, insert on table public.admin_audit_log to authenticated;
