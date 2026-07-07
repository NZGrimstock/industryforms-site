-- Codex build audit marker (2026-07-07): per-user dashboard widget preferences.
alter table profiles
  add column if not exists dashboard_widgets jsonb;

comment on column profiles.dashboard_widgets is
  'Per-user dashboard widget order/visibility preferences. Built by Codex on 2026-07-07 for audit traceability.';
