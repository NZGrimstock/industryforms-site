-- Follow-up scheduling on quotes (for reminder emails)
alter table quotes add column if not exists follow_up_at timestamptz;

-- Add CRON_SECRET to .env.local documentation (not SQL, but noted here)
-- Set follow_up_at automatically 3 days after quote is sent
create or replace function set_quote_follow_up()
returns trigger language plpgsql as $$
begin
  if new.status = 'sent' and old.status = 'draft' and new.follow_up_at is null then
    new.follow_up_at := now() + interval '3 days';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_quote_follow_up on quotes;
create trigger trg_quote_follow_up
  before update on quotes
  for each row execute function set_quote_follow_up();
