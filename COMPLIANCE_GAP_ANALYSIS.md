# TradeHub — Security & Compliance Gap Analysis

**Date:** 2026-07-07
**Scope:** Engineering-level review of the codebase against technical controls typically required by SOC 2, ISO 27001, GDPR, and PCI DSS.

**This is not a certification.** None of these frameworks can be satisfied by a code review:
- **SOC 2 Type II / ISO 27001** require a formal audit by an accredited third party over an observation period (SOC 2: typically 3–12 months of evidence).
- **GDPR** is a legal framework — lawful basis, DPAs with subprocessors, breach notification procedures, and data subject rights all need legal review, not just code.
- **PCI DSS** is a self-assessment (SAQ) validated against your actual Stripe integration shape, not a one-time code scan.

What follows is the engineering input an auditor or lawyer would need as a starting point.

---

## Fixed across this engagement (2026-07-07)

- **admin/setup lockdown** — `app/api/admin/setup/route.ts` now uses a constant-time secret comparison (`crypto.timingSafeEqual`) and self-disables permanently once any super-admin account exists, so a leaked `ADMIN_SETUP_SECRET` can't be replayed after go-live.
- **Search-route filter injection fixed** — `app/api/search/route.ts` now wraps user input in a quoted, escaped PostgREST literal instead of interpolating it raw into `.or()`. Verified live: an injection payload (`a,customer_id.neq.<uuid>`) is now treated as literal search text, not filter syntax.
- **`admin_audit_log` now has a producer** — `lib/audit.ts`'s `logAdminAction()` helper is wired into `admin/setup` (bootstrap), `admin/trial` (extend/reset/end), `admin/site/takedown` (disable/restore), and `admin/deletion-requests` (verify/reject/complete). Privileged actions are now traceable.
- **`calendar_sync_log` RLS gap closed** — migration `20260707034000_calendar_sync_log_rls.sql` applied to the linked Supabase project; standard company-scoped policies now match every other tenant table.
- **MFA built and enforced for super-admins** — Supabase Auth's native TOTP support: any user can enroll via Settings → My profile (verified live — real QR/secret from the project), login challenges for a 6-digit code once enrolled (`app/login/page.tsx`), and `app/admin/layout.tsx` now hard-requires `aal2` to reach any `/admin` route — an unenrolled super-admin is redirected to enroll before they can get in, and a session that hasn't completed its aal2 challenge is sent back through login. (The admin-layout branch reuses the same `getAuthenticatorAssuranceLevel()` call verified working in the login flow; it wasn't separately exercised live against a real super-admin account in this pass.)
- **Password complexity policy** — `lib/password.ts` (8+ chars, upper, lower, number) enforced server-side in `auth/signup` and `admin/setup`, and client-side in signup/reset-password for immediate feedback.
- **`.env.example`** added, listing every env var actually referenced in the codebase.
- **Auth-failure logging** — `lib/api-auth.ts`'s `resolveCompanyUser` now logs rejected bearer tokens and orphaned-profile lookups.
- **Account-deletion is no longer just an email** — new `/admin/deletion-requests` page lets a super-admin verify, reject, or complete a request. "Complete" deletes the matched auth user (profile cascades) so they can no longer log in and their name/email/phone are gone, while company records, invoices, and jobs are intentionally retained (matches privacy.md's own legal/tax retention carve-out) — every action is audit-logged.
- **`privacy.md` corrected**: region wording now says Singapore (matches the actual `ap-southeast-1` project region, confirmed by the user — this needed a business decision, not a silent patch, since the option was "migrate region" vs. "fix wording" and the user chose to keep Singapore); subprocessors section now names Supabase, Stripe, Resend, and Anthropic explicitly instead of describing them generically.
- **Zod validation** added to the highest-risk routes: `app/api/bookings/create` (public/unauthenticated), `app/api/jobs`, `app/api/sms/send` (1600-char cap to bound Twilio cost/abuse).
- **`xlsx` vulnerability resolved** — repointed from the vulnerable npm-registry `xlsx@0.18.5` to SheetJS's own patched CDN build, their official remediation since they stopped publishing fixes to npm. User confirmed before installing (external, non-registry source).
- **Zod validation rolled out across the API surface** — every route that accepts a user-supplied body/query now validates it with a zod schema (uuid/email/enum/length-bounded), replacing ad hoc truthy checks. A handful of routes were deliberately left without zod because they already had equivalent-or-stronger custom validation (e.g. `archive`/`delete`'s `ALLOWED_TABLES` membership check, `test-mode`'s action if/else, `account-deletion`'s regex+trim+length guards, cron routes gated by `CRON_SECRET`, webhooks gated by provider signature verification) — adding zod there would have been a redundant abstraction, not a real fix.
- **Two OAuth account-linking vulnerabilities found and fixed** (`app/api/google/callback/route.ts`, `app/api/xero/callback/route.ts`): both callbacks trusted a client-supplied `state` param for whose profile/company to write tokens into. An attacker could complete their own Google/Xero OAuth consent, then hit the callback directly with an arbitrary `state` encoding a victim's id — planting the attacker's own refresh token on the victim's account. The victim's later "sync" action would then push their own data (calendar visits with customer names/addresses, or invoices) into the **attacker's** Google/Xero account. Fixed by deriving the user/company from the actual authenticated session instead of trusting `state`.
- **Five cross-tenant authorization gaps found and fixed** — `app/api/portal/send-link`, `app/api/xero/sync`, `app/api/email/invoice`, `app/api/email/quote`, `app/api/email/purchase-order`, `app/api/sms/invoice`, `app/api/sms/quote` all fetched a record by raw ID via the service-role client (which bypasses RLS) without checking it belonged to the caller's own company. Any authenticated user from any company could pass another company's invoice/quote/PO/customer ID and trigger an unrelated company's document being emailed/texted, its status flipped to "sent", or (for `xero/sync`) its data pushed into the caller's own Xero organization. All now verify `record.company_id === caller.company_id` before acting.
- **[CRITICAL — the most severe finding of this whole engagement, found in the dedicated grep pass] Unauthenticated tenant takeover via `app/api/auth/invite`** — this route had **no authentication check at all**. It accepted `{ full_name, email, role, companyId }`, created a brand-new auth user with an attacker-chosen email and attacker-chosen `role` (including `'admin'`), inserted a profile into `companyId`, and returned the new account's password in the plain JSON response. `companyId` is not a secret — it's rendered directly into the public booking widget's client-side JS (confirmed via `booking-widget.tsx`), so any anonymous visitor to any company's public booking page could pull that company's UUID from the network tab and immediately mint themselves an admin account inside it, password included. Fixed: the route now requires an authenticated session, verifies the caller's own `profile.company_id` matches the target `companyId`, and requires the caller's role to be `owner`/`admin`. Verified live: an unauthenticated request now returns 401; an authenticated request targeting a different company now returns 403.
- Full `tsc --noEmit` and `next build` run clean after every change; MFA enrollment, the search-injection fix, and the `auth/invite` fix (both the 401 and 403 branches) were all verified live in-browser against the real Supabase project.

## Dedicated grep pass results

Ran `grep -rn "\.eq('id'," app/api` across all 51 routes using the service-role client, cross-checked every match against the caller's own company/session. Beyond the `auth/invite` finding above, everything else checked out:
- **Already correctly scoped**: `sms/send`, `stripe/terminal/payment-intent`, `bookings/refund`, `bookings/[id]`, `quote-templates`, `website/domain`, `storage/signature`, `bookings/hold` (all filter by `company_id` in the same query or compare it explicitly).
- **Self-lookups, not cross-tenant risk**: routes doing `.eq('id', user.id)` on their own profile (`google/disconnect`, `google/sync`, `import`, `invitations/*`, `site/custom/upload`, `compliance/generate`).
- **Protected by RLS instead of an app-level check** (using the session-scoped client, not service-role): `messages/action`, `messages/thread`, `notify` — `notify`'s `assignedToId` lookup runs through the session client, so RLS's "select profiles in own company" policy silently returns nothing for a cross-tenant id rather than leaking.
- **IDs derived from an already-scoped parent query, not attacker-supplied directly**: `invoices/bulk` (quote_id came from a job already filtered by `company_id`), `import` (match id came from a company-scoped duplicate lookup).
- **Intentionally public by design, gated by status/token instead of company ownership** (documented in-code as such): `bookings/create`, `bookings/deposit-intent`, `quotes/[token]/[action]` (public-token flows), `admin/*` routes (super-admin gated, no tenant boundary applies).
- **System-wide by design, not attacker-controlled input**: `reminders`, `daily-todos` (cron jobs that intentionally iterate every company; the IDs they act on come from their own internal queries, not a request body) and `stripe/webhook` (IDs come from Stripe's own signed event payload, echoing metadata this app set itself).

No further gaps found. The "Still open" list from the previous pass no longer includes the cross-tenant-pattern caveat — this pass resolved it.

## Still open

1. **[MODERATE]** Transitive `postcss <8.5.10` via Next's bundled copy — fix requires a Next major version bump, deliberately not attempted here (too likely to introduce unrelated breakage without its own dedicated upgrade/test pass).
2. **[LOW]** `admin_audit_log` now covers 4 admin routes; still not wired into every privileged action (invoice edits/deletes, payment/refund actions, invitation accept/decline, login events). Supabase's own auth logs already cover login events at the platform level, which most SOC2 auditors accept as sufficient evidence — worth confirming with your auditor rather than duplicating in-app.
3. Data export/portability (GDPR Art. 20) still doesn't exist — only relevant if you have EU/UK customers.

---

## Findings by control area

### Authentication & Session Management (SOC2 CC6.1)
- Auth is Supabase Auth via `@supabase/ssr`; `proxy.ts:156` calls `supabase.auth.getUser()` (validates against Supabase, not just decoding a cookie — correct). `proxy.ts:159` exempts all `/api/*` routes from session middleware — each route self-checks auth via `lib/api-auth.ts`'s `resolveCompanyUser`, its own `is_super_admin` check, or a machine-to-machine secret (Stripe/Twilio signature, `CRON_SECRET`, `INBOUND_EMAIL_SECRET`). Of ~20 routes sampled directly (admin, billing, storage, invitations, xero, webhooks), all verified identity correctly before privileged queries; the full set of 57 files using the service-role client was not 100% enumerated — recommend a full pass, or a lint rule flagging `createServiceClient()` calls not preceded by an auth check in the same file, before formal sign-off. **Structural risk stands regardless:** no defense-in-depth at the middleware layer — a new route that forgets its own auth check is silently public.
- Mobile bearer-token path (`lib/api-auth.ts:13-17`) correctly validates via service-role client, but failed/invalid auth attempts are silently swallowed with no logging (see Audit Trail below).
- **[HIGH] No MFA** anywhere in the app — see priority fix #0.
- **[MEDIUM] No app-level password policy** — `app/api/auth/signup/route.ts:6-17` and the invite-accept flow pass the password straight to Supabase Auth with no min-length/complexity check of their own, relying entirely on Supabase's project-level default (typically a 6-character minimum) with no visibility into whether leaked-password protection is enabled.
- **[LOW-MEDIUM]** No `.env.example` exists anywhere in the repo — onboarding a new environment relies on tribal knowledge of which secrets are required, not a canonical documented list.

### Authorization / Row Level Security
- Full pass across all 55 migration files, cross-referencing 59 tables against 58 `ENABLE ROW LEVEL SECURITY` statements: consistent `current_company_id()`/`is_admin_or_owner()` `security definer` helper pattern, role-tiered write policies, no `USING (true)` permissive policies found anywhere.
- **[MEDIUM] One table has no RLS**: `calendar_sync_log` (`supabase/migrations/017_google_calendar.sql:7-14`) — has a `company_id` column but was never given an `ENABLE ROW LEVEL SECURITY` statement or policies. Currently mitigated because only `lib/google-calendar.ts` touches it, exclusively via the service-role client (which bypasses RLS anyway) — so there's no active exploit path today, but it's a defense-in-depth gap: if any future feature queries this table via a normal client, it leaks calendar-sync data across companies with zero protection. Fix: add the same RLS pattern used elsewhere.
- **Informational, evidence of a real prior gap**: `admin_audit_log` shipped with no RLS at all — `016_audit_log_rls.sql`'s own comment states the table "was fully exposed to anon/authenticated" before that migration. It's since been correctly remediated (super-admin-only read/insert), but it shows RLS wasn't part of the original table-creation checklist. Recommend a CI check that fails if a migration creates a table without a paired RLS-enable statement, to stop this recurring.

### Secrets Management
- Service-role key (`SUPABASE_SECRET_KEY`) confined to server-only files (`lib/supabase/server.ts`, `proxy.ts`), never in client bundles.
- `.env.local` gitignored; no `.env*` files tracked in git history checked.
- Stripe/Twilio/Resend/Anthropic keys all read server-side from `process.env` only.

### PCI DSS / Cardholder Data
- No raw PAN/CVC handling anywhere in the app — confirmed via repo-wide search. Card capture is entirely client-side via Stripe's Payment Element; server only handles PaymentIntent IDs and amounts.
- This architecture qualifies for **SAQ-A**, the lightest PCI self-assessment tier — but this must still be self-attested (or QSA-validated) against Stripe, not certified by a code review.
- Webhook signature verification present and correct (`app/api/stripe/webhook/route.ts`).

### PII / GDPR Signals
- PII stored: `profiles` (name/email/phone), `customers` (name/contact/email/phone/billing address), `customer_sites` (address + free-text access notes, sometimes including sensitive details like gate codes/dogs on-site), booking widgets (customer email/phone/name/site address).
- **[MEDIUM]** Account-deletion flow (`account_deletion_requests` table + `app/api/account-deletion/route.ts`) is an **intake queue only** — it records the request, RLS-restricts it to super-admins, and emails `privacy@industryforms.co.nz`, but there is no automated purge job, cron, or SQL function that actually deletes/anonymizes data. `privacy.md:67` commits to deletion "within 90 days" but nothing in code enforces or timestamps that commitment. Fine as a v1 process if genuinely handled manually and promptly, but there's no evidence trail proving it happens — worth automating or at least logging completion.
- **[HIGH if EU/UK subjects are ever in scope, lower for NZ/AU-only]** No self-service data export found anywhere (no `GET /api/export` or equivalent) — GDPR Art. 20 data portability isn't supported. NZ/AU Privacy Act only requires "access," not machine-readable export, so this is lower priority if your customer base is genuinely ANZ-only.
- **[MEDIUM]** `privacy.md:53` describes subprocessors generically ("cloud hosting providers, analytics tools, and email delivery services") without naming Supabase, Stripe, Resend, AWS/R2, or Anthropic explicitly — a transparency gap against GDPR Art. 13/14 subprocessor disclosure. Confirmed subprocessors from `package.json`: Supabase (DB/auth/storage), Stripe (payments), Resend (email), AWS S3-compatible SDK (storage, likely R2 per earlier context), Anthropic (AI features). **No Twilio dependency found** despite SMS features implied elsewhere — worth confirming whether SMS is actually implemented via a different provider or not yet built, separately from this audit.
- **[HIGH — needs verification, not a code fix]** `privacy.md:62` claims customer data is stored "in Australia or New Zealand." This audit could not verify the actual Supabase project region or R2 bucket region from the repo (it's a dashboard/account setting, not in code). If the real infrastructure is hosted outside ANZ, this is a factual misrepresentation in a legal document — verify this against your actual Supabase project settings immediately, since it's a five-minute check with real legal exposure if wrong.
- No PII found logged to console anywhere (checked account-deletion, signup, compliance-generate routes, email lib) — clean.
- Deletion-request emails include customer PII with only partial HTML escaping — low-risk formatting issue in an outbound email, not an in-app XSS vector.

### Encryption
- Transport: TLS via Vercel/Supabase termination (platform-level, nothing to configure).
- At-rest: Supabase-managed Postgres default encryption. No application-level field encryption for PII — standard for this class of SaaS, only a gap if a specific contract requires it.

### Input Validation / Injection
- No raw SQL string concatenation found anywhere sampled — all DB access goes through Supabase's query builder or `.rpc()`.
- However, `app/api/search/route.ts:29-35` hand-builds `.or()` filter strings by directly interpolating user input — this is PostgREST filter injection, not SQL injection, but has the same category of risk (see priority fix #2). RLS bounds it to same-tenant data today.
- `zod` is installed but used by **zero** of the ~70 API routes — all validation is manual presence/length checks with no format/enum enforcement (see priority fix #4). Spot-checked routes: `jobs` (no status enum check), `invoices` (no UUID format check on `job_id`), `bookings/create` (public + unauthenticated, no email/phone format validation), `sms/send` (no length cap).
- `stripe/webhook/route.ts` correctly verifies signatures via `stripe.webhooks.constructEvent` before touching the DB — the one route sampled that does input validation right.

### Logging & Audit Trail
- Two audit-relevant tables exist: `automation_events` (system notification lifecycle — booking confirmations, reminders, review requests; no actor/user_id field, this is a system log not a user-action audit trail) and `admin_audit_log` (actor-based: `admin_id, action, target_type, target_id, details, created_at`, RLS-hardened in `016_audit_log_rls.sql` to super-admin-only read/insert).
- `automation_events` is actively written to (`lib/notify.ts`, `lib/bookings/notify.ts`, `app/api/reminders/route.ts`) — this pathway works.
- **`admin_audit_log` has zero application code writing to it.** Checked `admin/setup`, `admin/trial`, `admin/site/takedown` — none insert an audit row despite the table's RLS being correctly configured for exactly this purpose. This is a schema shell with no producer.
- No audit trail exists for: role/permission changes (`is_super_admin` flips), invoice edits/deletes, payment/refund actions, account deletion, invitation accept/decline, or login events.
- Failed/invalid auth attempts in `resolveCompanyUser` are silently discarded (return `null`) with no logging — limits incident forensics if you need to investigate a breach attempt.

### Dependency Vulnerabilities (`npm audit`)
- **HIGH:** `xlsx@0.18.5` — see priority fixes above.
- **MODERATE:** transitive `postcss <8.5.10` bundled via Next.

---

## Recommended next steps
1. Fix the priority items above, in order: admin/setup lockdown → search-route filter injection → wire up `admin_audit_log` inserts on privileged actions → adopt `zod` schemas on at least the public/unauthenticated and financial routes → remove/replace `xlsx`.
2. Add auth-failure logging to `resolveCompanyUser`.
3. Run a scripted RLS-coverage check across all migrations (not just the sample above).
4. Confirm the account-deletion process against your actual privacy policy's stated timelines.
5. Hand this document to a lawyer for GDPR/DPA review and to a QSA (or Stripe's guidance) for PCI SAQ-A self-attestation.
6. If pursuing SOC 2/ISO 27001 formally, engage an accredited auditor — they'll want this document plus policy artifacts (access control policy, incident response plan, vendor management policy) that don't exist in code.
