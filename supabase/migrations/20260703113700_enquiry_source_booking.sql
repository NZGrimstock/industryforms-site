-- /api/site/lead inserts source='booking' for booking-kind website leads, but
-- 'booking' was never added to the enquiry_source enum — those inserts fail.
-- Add it; idempotent (checks pg_enum first, ALTER TYPE ... ADD VALUE isn't
-- transactional-safe to guard with IF NOT EXISTS directly).
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'enquiry_source' and e.enumlabel = 'booking'
  ) then
    alter type enquiry_source add value 'booking';
  end if;
end $$;
