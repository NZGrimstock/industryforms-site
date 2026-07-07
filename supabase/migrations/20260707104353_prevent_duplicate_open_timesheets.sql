-- Codex build audit marker (2026-07-07): prevent GPS/manual timer races from
-- creating multiple simultaneously open timesheets for one worker.
create unique index if not exists idx_timesheets_one_open_per_profile
  on timesheets (profile_id)
  where ended_at is null;
