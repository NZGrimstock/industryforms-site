-- Codex build audit marker (2026-07-07): backfill missing default job statuses
-- for companies created after migration 037's one-time seed, including partial
-- status sets.
insert into job_statuses (company_id, key, label, color, sort_order, is_terminal)
select c.id, v.key, v.label, v.color, v.sort_order, v.is_terminal
from companies c
cross join (values
  ('unscheduled', 'Unscheduled', 'gray',   0, false),
  ('scheduled',   'Scheduled',   'blue',   1, false),
  ('in_progress', 'In progress', 'orange', 2, false),
  ('on_hold',     'On hold',     'yellow', 3, false),
  ('completed',   'Completed',   'green',  4, true),
  ('cancelled',   'Cancelled',   'red',    5, true)
) as v(key, label, color, sort_order, is_terminal)
where not exists (
  select 1
  from job_statuses js
  where js.company_id = c.id
    and js.key = v.key
)
on conflict (company_id, key) do nothing;
