-- Add vehicle registration field to profiles for vehicle logbook
alter table profiles add column if not exists vehicle_registration text;
