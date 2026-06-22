-- Auto-generated daily to-dos.
--
-- The /api/daily-todos cron creates one row per (user, source artefact) per day
-- so a user opens the app each morning to a fresh checklist. Incomplete items
-- from yesterday persist (due_date is bumped forward) instead of duplicating;
-- when the underlying artefact is resolved (quote sent, invoice paid, visit
-- completed) the to-do auto-completes.
--
-- A unique index on (assigned_to, source_type, source_id) gives us safe upserts.

alter table todos add column if not exists is_auto       boolean      not null default false;
alter table todos add column if not exists source_type   text;
alter table todos add column if not exists source_id     uuid;
alter table todos add column if not exists auto_completed_at timestamptz;

-- Partial unique index — only enforced when this is an auto-generated row with
-- both source columns populated, so user-created todos remain free-form.
create unique index if not exists todos_auto_source_unique
  on todos (assigned_to, source_type, source_id)
  where is_auto and source_type is not null and source_id is not null;

create index if not exists todos_source_idx on todos (source_type, source_id);
