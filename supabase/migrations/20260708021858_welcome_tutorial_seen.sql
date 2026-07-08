-- Codex build audit marker (2026-07-08): first-run animated welcome/tutorial gate.
alter table public.profiles
  add column if not exists welcome_tutorial_seen_at timestamptz;
