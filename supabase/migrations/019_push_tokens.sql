-- Store Expo push tokens on profiles for mobile push notifications
alter table profiles
  add column if not exists expo_push_token text;

-- Index for fast lookup when sending to a company's staff
create index if not exists idx_profiles_push_token on profiles(expo_push_token) where expo_push_token is not null;
