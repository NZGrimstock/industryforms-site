# Growth Engine — Re-scoped Sprints

Last updated: 2026-07-03. Supersedes `SPRINT_GROWTH_ENGINE_ARCHITECTURE_IMPLEMENTATION.md`.
Same architecture and end-state; broken into independently shippable sprints and
corrected to reflect what is actually live.

## What changed from the original plan

- **Stripe is live** (keys + products configured). Deposit flow and paywall are no longer blocked.
- **Resend is live** (`RESEND_API_KEY` in Vercel). Email automations work now.
- **Twilio is intentionally NOT live** — SMS stays dark during build/test to avoid fees.
  Every notification path is therefore **channel-aware**: it sends email now and only
  sends SMS once Twilio is flipped on. Nothing SMS-related may hard-fail while dark.
- **Pricing consolidated to a single add-on**: **Bookings Website — $19/mo**. The
  three-SKU $14/$14/$19 structure is gone.
- **New requirement**: per-company **toggle** to show/hide bookings on the website
  (a paying company may want the site but not online booking).
- **New requirement**: **custom HTML/code hosting** — a company can upload their own
  static site instead of using the Instant Website builder, hosted on their subdomain/custom domain.

## Foundations status (was a whole sprint, now mostly done)

| Piece | State | Action |
|---|---|---|
| Stripe | **Live** | Confirm webhook target `/api/stripe/webhook` receives events in prod. |
| Resend | **Live** | Confirm `EMAIL_FROM` verified sender resolves in prod. |
| Twilio | **Deliberately dark** | Keep credentials unset/gated. Build SMS paths behind a channel check. Signature verification (below) still built now, ready for go-live. |
| Twilio inbound signature verification | **Not done** | Build in Sprint A so it's ready the day Twilio flips on. No cost to build while dark. |

## Cross-cutting principles (apply to every sprint)

1. **Channel-aware sends.** A single `notify(company, customer, event, {email, sms})`
   helper picks channels by what's live and by company/customer preference. `lib/sms.ts`
   must no-op cleanly (log + mark `skipped_sms_dark`) when Twilio is unconfigured, never throw.
2. **Idempotency on every webhook-driven state change.** Stripe retries. Key all
   booking/payment state transitions off `stripe_payment_intent_id` and guard job/visit
   creation and confirmation sends so a retry can't double-create or double-notify.
   Follow the existing idempotent `maybeSendReviewRequest()` pattern.
3. **Public endpoints are hostile by default.** `/api/site/lead`, `/api/bookings/*`
   are unauthenticated writes that can create rows and (later) spend money on SMS/Stripe.
   Rate-limit per IP + per company, add a honeypot field, cap body size, and never
   trigger a paid send before minimal validation.
4. **Every new table**: `company_id`, RLS enabled, scoped to `current_company_id()`,
   writes limited to owner/admin, public access only via server routes using the service client.

---

# Sprint A — Unified Inbox

**Ships first. No external dependencies. Delivers value even with Twilio dark**, because
enquiries, website leads, and (later) booking requests populate it immediately.

## Objective

One owner/admin inbox for all inbound customer communication, and — critically — a home
for **unmatched inbound messages** that currently have nowhere to land.

## Reuse

`customer_messages`, `communications`, `enquiries`, `customers`, `quotes`, `invoices`.

## Schema

```sql
alter table customer_messages
  add column if not exists read_at     timestamptz,
  add column if not exists assigned_to  uuid references profiles(id) on delete set null,
  add column if not exists status       text not null default 'open',
  add column if not exists source       text not null default 'sms';
-- status: open | pending | closed | spam
-- source: sms | email | booking | enquiry | web_lead
```

## Files

- `tradiee-app/app/(dashboard)/messages/page.tsx`
- `tradiee-app/app/(dashboard)/messages/client.tsx`
- `tradiee-app/components/customers/sms-thread.tsx` (extract shared thread component)
- `tradiee-app/app/api/sms/inbound/route.ts` (add signature verification)
- `supabase/migrations/*_inbox.sql`

## Tasks

- Central `/messages` page: left conversation list, right thread, top filters
  (channel, status, assignee, search).
- Tabs: Open, Unread, Bookings, Enquiries, Unmatched, Closed.
- Unified feed merges `customer_messages` + `enquiries` + website leads (RLS-scoped).
- Reply box wired to `/api/sms/send` — **built but shows a "SMS not enabled" state**
  while Twilio is dark; email reply path works now.
- Quick actions: create customer, link to existing customer, create quote/job, mark closed/spam.
- Add `X-Twilio-Signature` verification to `/api/sms/inbound` (ready for go-live).
- Sidebar entry: **Messages**.

## Acceptance criteria

- Owner/admin sees all inbound enquiries, web leads, and booking requests in one place.
- Unmatched inbound (unknown sender) is visible in the Unmatched tab and can be
  converted to a customer.
- The `/customers/[id]` thread and the `/messages` thread render the same data.
- Inbound SMS webhook rejects unsigned requests (verified with Twilio's test signature),
  even though live traffic is off.

## Done when

Messages page is useful for enquiry/lead/booking triage today, and the SMS half lights
up automatically the moment Twilio is enabled — no further inbox work required.

---

# Sprint B — Website Add-on: bookings toggle + custom-site hosting

Productizes the **$19 Bookings Website** add-on and adds the two new requirements.
Independent of the booking engine — it's the container the booking widget will later live in.

## Objective

- Gate website + bookings behind the single `$19/mo` add-on.
- Let a paying company **toggle bookings on/off** on their site independently.
- Let a company **upload and host their own static site** instead of the builder.

## Schema

```sql
-- Company-level website/bookings config. Prefer columns on companies over a new table.
alter table companies
  add column if not exists bookings_enabled  boolean not null default false,
  add column if not exists site_mode         text    not null default 'builder', -- builder | custom
  add column if not exists custom_site_key   text,        -- R2 object prefix for uploaded site
  add column if not exists custom_site_status text default 'none'; -- none | active | disabled
```

Add-on key lives in existing `companies.addons` JSONB as `bookings_website`
(`lib/billing.ts hasAddon('bookings_website')`).

## Part 1 — Add-on gating + bookings toggle

Files:

- `tradiee-app/lib/billing.ts`, `tradiee-app/lib/plans.ts`
- `tradiee-app/app/(dashboard)/website/*` (toggle UI)
- `tradiee-app/app/api/stripe/webhook/route.ts`

Tasks:

- Add `bookings_website` add-on; on `customer.subscription.created/updated/deleted`,
  flip `companies.addons.bookings_website.active` idempotently.
- Website builder + custom hosting + booking widget all gate on `hasAddon('bookings_website')`.
- `bookings_enabled` toggle in the website settings UI. When false, the booking
  section/route is hidden and `/api/bookings/*` returns 404 for that company —
  **even if the add-on is active**. Two independent gates: add-on (paid) and toggle (wanted).

Acceptance:

- Company without the add-on cannot publish a site or enable bookings.
- Company with the add-on can turn bookings off and still run their website.

## Part 2 — Custom static-site hosting

Files:

- `tradiee-app/app/(dashboard)/website/custom/*` (upload UI)
- `tradiee-app/app/api/site/custom/upload/route.ts`
- `tradiee-app/proxy.ts` (serve custom site when `site_mode = 'custom'`)
- `tradiee-app/lib/storage/*` (R2)

Scope (MVP):

- Upload a **single `index.html`** or a **zip of static assets**
  (html/css/js/images/fonts only — reject executables and server code).
- Store under R2 public bucket at `custom-sites/{company_id}/...`; set `custom_site_key`.
- `proxy.ts`: when the tenant's `site_mode = 'custom'`, serve the uploaded assets from
  R2 instead of rendering builder sections, path-preserving as it already does.
- Booking widget on a custom site is added via an **embeddable iframe/snippet**
  (see Sprint D), not by injecting into their markup.

**Security (non-negotiable — this hosts arbitrary third-party code):**

- **Static only.** Never execute uploaded code server-side.
- **Origin isolation is the security model, not sanitization.** You cannot sanitize a
  customer's own JS without breaking their site, so isolate it by origin instead.
- **Verify app auth cookies are host-scoped to `app.industryforms.app`, NOT the
  `.industryforms.app` wildcard.** This is the single most important check: if session
  cookies are readable on the wildcard, an uploaded script on `tenant.industryforms.app`
  could steal them. Confirm current cookie scope before shipping this.
- Set a restrictive **CSP** on served custom content preventing it from framing the
  dashboard or making credentialed requests to app APIs.
- **Reputation/abuse**: someone can host phishing/malware on `x.industryforms.app`.
  Require the paid add-on (card-on-file = identity), block free-trial accounts from
  custom hosting, and provide a one-click **takedown** (`custom_site_status = 'disabled'`).
  Prefer steering custom sites onto **their own custom domain** (already supported via
  Cloudflare for SaaS) so abuse never touches the `industryforms.app` reputation surface.
- Cap upload size; whitelist MIME types.

Acceptance:

- A company can upload a static site and see it served at their subdomain/custom domain.
- App session cookies are provably not exposed to tenant subdomains.
- Custom site can be disabled instantly by super-admin.

## Done when

The $19 add-on gates website + bookings, bookings can be toggled independently, and a
company can host either a builder site or their own static site — with cookie isolation verified.

---

# Sprint C — Bookable Packages + Availability Engine

The technically hardest sprint. **Do the concurrency design before writing slot code.**

## Objective

Define bookable packages and generate genuinely-safe available time slots.

## Schema

```sql
create table if not exists bookable_packages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  kit_id uuid references kits(id) on delete set null,
  price_list_item_id uuid references price_list_items(id) on delete set null,
  name text not null,
  description text,
  category text,
  public_slug text,
  duration_minutes integer not null default 60,
  buffer_before_minutes integer not null default 0,
  buffer_after_minutes integer not null default 15,
  price numeric(12,2) not null default 0,
  deposit_amount numeric(12,2),
  deposit_percent numeric(6,2),
  requires_deposit boolean not null default false,
  auto_confirm boolean not null default false,
  creates_job boolean not null default true,
  creates_invoice boolean not null default false,
  recurring_interval_months integer,            -- for win-back reminders (Sprint E)
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookable_packages_company_idx
  on bookable_packages(company_id, is_active, sort_order);

create table if not exists booking_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  timezone text not null default 'Pacific/Auckland',
  min_notice_hours integer not null default 12,
  max_days_ahead integer not null default 45,
  slot_interval_minutes integer not null default 30,
  default_buffer_minutes integer not null default 15,
  require_manual_approval boolean not null default true,
  confirmation_channel text not null default 'email',  -- email now; 'sms_email' when Twilio live
  reminder_hours_before integer not null default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists booking_availability_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  is_active boolean not null default true
);

create table if not exists booking_blackouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text
);
```

## Availability engine — the parts the original plan's single bullet hid

Files: `tradiee-app/lib/bookings/availability.ts`, `tradiee-app/app/api/bookings/availability/route.ts`.

- **Timezone correctness**: generate slots in the company `timezone`, DST-safe. Store/compare
  in UTC; never do naive local arithmetic across a DST boundary.
- **Inputs**: availability rules, blackouts, existing `job_visits`, package duration +
  buffers, min-notice, max-days-ahead, optional assigned staff.
- **Concurrency / slot-hold (the production-breaker if skipped):** the schema has no way
  to reserve a slot, so two visitors can both pass the availability check and both confirm
  into the same time. Add a short-lived hold:
  - On "select slot", create a `bookings` row (Sprint D) in a **`slot_held`** state with a
    `hold_expires_at` (e.g. now + 10 min). Availability generation must exclude live holds.
  - Guard the hold insert with a transaction + `SELECT … FOR UPDATE` (or a unique partial
    index on `(company_id, assigned_to, starts_at)` for non-expired holds) so two concurrent
    holds on the same slot can't both succeed.
  - A cron reaps expired holds back to availability.

Acceptance:

- The public widget only shows valid, un-held, un-booked slots.
- A slot disappears the instant an existing `job_visit` or a live hold occupies it.
- Two simultaneous holds on the same slot: exactly one succeeds.
- Admin can set business hours and blackouts.

## Done when

Packages are configurable (from scratch or from a kit/item) and the availability API
returns correct, concurrency-safe slots.

---

# Sprint D — Public Booking Widget + Stripe Deposits

Stripe is live, so the deposit flow ships here for real.

## Schema

```sql
create table if not exists bookings (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  package_id uuid references bookable_packages(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  enquiry_id uuid references enquiries(id) on delete set null,
  job_id uuid references jobs(id) on delete set null,
  visit_id uuid references job_visits(id) on delete set null,
  invoice_id uuid references invoices(id) on delete set null,
  assigned_to uuid references profiles(id) on delete set null,
  status text not null default 'requested',
  -- requested | slot_held | deposit_pending | confirmed | scheduled | completed | cancelled | no_show
  customer_name text not null,
  customer_email text,
  customer_phone text,
  site_address text,
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  hold_expires_at timestamptz,                    -- for slot_held reaping (Sprint C)
  deposit_required numeric(12,2) not null default 0,
  deposit_paid numeric(12,2) not null default 0,
  deposit_refunded numeric(12,2) not null default 0,
  stripe_payment_intent_id text,
  public_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists bookings_company_status_idx on bookings(company_id, status, starts_at);
create unique index if not exists bookings_public_token_idx on bookings(public_token);
```

**Source-of-truth rule:** `customer_*` columns capture what the visitor typed. Once
`customer_id` is set by matching, the linked `customers` row wins for all display;
the captured fields are historical only.

## Files

- `tradiee-app/app/site/[slug]/book/[packageSlug]/*` (widget)
- `tradiee-app/app/api/bookings/create/route.ts`
- `tradiee-app/app/api/bookings/deposit-intent/route.ts`
- `tradiee-app/app/api/bookings/confirm/route.ts`
- `tradiee-app/app/api/stripe/webhook/route.ts`
- Embeddable snippet/iframe for custom sites (ties to Sprint B).

## Widget + matching

1. Select package → 2. pick slot (creates `slot_held`) → 3. enter name/email/phone/address
→ 4. confirm price + deposit → 5. pay deposit (if required) → 6. confirmation screen.

- Match by normalized **email first, phone second**. Conflicting matches → create booking
  and flag for admin review, never silently attach to the wrong customer.
- No match → create customer + customer site.
- Gated on `hasAddon('bookings_website')` **and** `companies.bookings_enabled`.

## Booking creation rules

- `auto_confirm` + no deposit → booking + job + visit immediately.
- Deposit required → `deposit_pending`; confirm from Stripe webhook only.
- Manual approval → `requested`, appears in Messages/Bookings inbox.

## Stripe webhook (idempotent)

On `payment_intent.succeeded`, find booking by `stripe_payment_intent_id`, then:
set `deposit_paid`, transition status, create job/visit **if not already created**,
insert payment row **if** an invoice exists, fire confirmation via `notify()`
(email now, SMS when live). Every step guarded so retries are no-ops.

## Decision required before taking money: **deposit refund policy**

Non-account-holders are paying deposits. Define, in product and in code, what happens on
`cancelled` / `no_show`: who can refund, within what window, and how (`deposit_refunded`
column + a Stripe refund call from an admin action). This is a Fair Trading / CGA
consideration in NZ, not just code — get the policy decided, then wire the refund path.

## Acceptance criteria

- Visitor books without logging in; existing customer matched, new one created when needed.
- Booking not confirmed until deposit succeeds when a deposit is required.
- Webhook is idempotent under Stripe retries (verified by replaying an event).
- Admin can refund a deposit and `deposit_refunded` reflects it.
- Widget works both on a builder site and embedded in a custom-hosted site.

---

# Sprint E — Automations + Growth Reporting

Email automations go live now (Resend). SMS automations are **built but dark** until Twilio.

## Schema

```sql
create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  booking_id uuid references bookings(id) on delete cascade,
  event_type text not null,
  channel text not null,                 -- email | sms
  scheduled_for timestamptz,
  sent_at timestamptz,
  status text not null default 'pending',-- pending | sent | skipped_sms_dark | failed
  error text,
  created_at timestamptz not null default now()
);
```

## Tasks

- `notify()` helper: resolves channels by what's live + company/customer preference.
  Email sends now; SMS rows land as `skipped_sms_dark` until Twilio, then flip to sending
  with **zero code changes** on go-live.
- Booking automations: request/deposit/approval confirmation, 24h reminder,
  post-completion invoice, review request, recurring/win-back reminder.
- **Review engine**: email now; when Twilio's live, prefer SMS (higher open rate) via the
  same `notify()` call — no separate flow.
- **Win-back**: `/api/reminders` cron reads completed jobs whose package has
  `recurring_interval_months`, and queues a re-book message with the booking link.
  Queues as `skipped_sms_dark` today; sends when Twilio's on. (Could send via email now.)
- Reuse the existing reminders cron pattern; all sends logged to `automation_events`.

## Reporting (last — needs live data)

`tradiee-app/app/(dashboard)/reports/*`, `dashboard/page.tsx`:

- Leads by source, bookings by package, booking conversion rate, deposit revenue,
  review requests sent/clicked, revenue from automated follow-ups (traceable via
  `bookings.job_id`/`invoice_id`), repeat-customer revenue, avg inbound response time.

## Acceptance criteria

- Booking confirmation + reminder send automatically by email today; SMS versions are
  logged as dark and require no new work when Twilio flips.
- Failed/skipped sends are visible to admin.
- Owner can see how much work came from website bookings and automations.

---

# Suggested order & sizing

| Sprint | Ships | External deps | Relative size |
|---|---|---|---|
| A — Inbox | value today (enquiries/leads/bookings) | none | S |
| B — Website add-on + custom hosting | $19 gating, toggle, BYO site | Stripe (live), R2 (live) | M |
| C — Packages + availability | admin config + safe slots | none | L (concurrency) |
| D — Widget + deposits | public booking + money | Stripe (live) | L |
| E — Automations + reporting | the "sleep" engine + proof | Resend (live); SMS when Twilio flips | M |

Ship A and B in either order (independent). C must precede D. E is last.

# Open decisions to lock before the relevant sprint

- **Deposit refund/cancellation policy** (before D takes money) — NZ Fair Trading / CGA.
- **Custom-site abuse posture** (before B ships hosting) — trial exclusion, takedown,
  prefer custom domains, cookie-scope verification.
- **Matching-conflict UX** (before D) — how admin resolves an email-vs-phone customer clash.
- **Twilio go-live checklist** — signature verification (built in A), per-company number vs
  shared, and flipping `confirmation_channel` defaults to `sms_email`.
