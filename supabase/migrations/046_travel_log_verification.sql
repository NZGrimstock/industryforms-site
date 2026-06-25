-- Allow managers to verify auto-tracked trips in the logbook.
alter table travel_logs add column verified_at timestamptz default null;
alter table travel_logs add column verified_by uuid references profiles(id) on delete set null;
