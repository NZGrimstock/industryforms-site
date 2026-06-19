-- Add super admin flag to profiles
alter table profiles add column if not exists is_super_admin boolean not null default false;

-- Create admin_audit_log for tracking admin actions
create table if not exists admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid references profiles(id),
  action text not null,
  target_type text,
  target_id uuid,
  details jsonb,
  created_at timestamptz default now()
);

grant all on table admin_audit_log to anon, authenticated, service_role;
