-- Billing exemption for comped / app-store review accounts.
-- A company with billing_exempt = true is never paywalled (full access regardless
-- of trial expiry or subscription). Super admins (profiles.is_super_admin) bypass
-- the paywall too — this flag is for non-admin accounts that should stay unrestricted
-- (e.g. the Google Play / App Store review login).
alter table companies add column if not exists billing_exempt boolean not null default false;
