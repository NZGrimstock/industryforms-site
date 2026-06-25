-- Configurable default project stages per company.
-- null = use system defaults; empty array = no auto-add; non-empty = use these stage names.
alter table companies add column default_project_stages text[] default null;
