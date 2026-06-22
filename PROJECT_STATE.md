# IndustryForms — Project State (handoff)

Last updated: 2026-06-22. Catch-up doc for a fresh session. Read this first.

## What it is
**IndustryForms** — a SaaS job-management app for NZ/AU tradespeople (a Tradify
competitor). Monorepo at `D:\TRADIEE`:
- `tradiee-app/` — **Next.js 16** web app (App Router, Turbopack)
- `tradiee-mobile/` — **Expo SDK 56** mobile app (bare workflow, native `android/` dir)
- `supabase/migrations/` — database migrations (001–042)
- Root docs: this file, `POWERSYNC_SETUP.md`, `R2_SETUP.md`, `SUPABASE_CLOUD_MIGRATION.md`, `VERCEL_DEPLOY.md`, `sync-rules.yaml`

GitHub: **https://github.com/NZGrimstock/industryforms** (branch `main`, auto-deploys to Vercel).

### Where work lives right now
**`main` is current** — sprint-3 merged 2026-06-22 (`52eeac2`). Latest APK is
`tradiee-mobile/android/app/build/outputs/apk/release/app-release.apk`
(Jun 22 13:34, 116 MB). Migrations 001–042 all applied to cloud Supabase.
PowerSync sync rules switched to **streams (edition 3)** — already validated +
deployed via the PowerSync Dashboard.

## Live infrastructure (all provisioned)
| Piece | Detail |
|---|---|
| **Supabase** | Cloud project ref `cfltbpwrojtlpkjvresd` (Sydney/SEA). **New API keys**: publishable (client) + secret (server) — NOT legacy anon/service_role. Migrations 001–042 all applied to cloud. |
| **Web hosting** | **Vercel**, custom domain **app.industryforms.app**. Vercel **Root Directory = `tradiee-app`**, **Framework Preset = Next.js**. `tradiee-app/vercel.json` defines two daily crons (`/api/reminders` 20:00 UTC, `/api/daily-todos` 18:00 UTC = 6am NZ). |
| **Storage** | **Cloudflare R2** (S3-compatible). Buckets: `industry-forms-public` (logos, job photos, customer sign-offs — via **cdn.industryforms.app**) and `industry-forms` (private compliance PDFs via presigned URLs). |
| **Offline sync** | **PowerSync** `https://6a33b406deeddd0df605d498.powersync.journeyapps.com`, connected to cloud DB, JWKS auth via Supabase. `sync-rules.yaml` is now **edition-3 sync streams** (deployed). |
| **SMS** | **Twilio** — credentials live (configured by user 2026-06-22). Inbound webhook → `/api/sms/inbound`. |
| **Mobile** | Expo `@grimstock/industryforms` (EAS, logged in as `grimstock`). APK builds via **local Gradle**: `cd tradiee-mobile/android && ./gradlew assembleRelease --no-daemon`. Don't run release builds back-to-back — flaky `packageRelease` lock errors; if it fails run `./gradlew clean assembleRelease`. |

## Env vars (NEVER commit real secret values)
**Set in Vercel → Project Settings → Environment Variables** (Production +
Preview), then redeploy. Mirror non-secret ones in `tradiee-app/.env.local`
for local dev. Settings → Integrations now shows a green-tick / amber-warning
on each of these so the owner sees what's missing without peeking at env vars.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `R2_ACCOUNT_ID`, `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_*`/`R2_PRIVATE_*` keys, `NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://cdn.industryforms.app`
- `NEXT_PUBLIC_APP_URL=https://app.industryforms.app`, `NEXT_PUBLIC_POWERSYNC_URL`, `CRON_SECRET`
- **Twilio (live)** — `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`. Point the number's "A MESSAGE COMES IN" webhook at `https://app.industryforms.app/api/sms/inbound` (POST).
- **Resend (pending)** — `RESEND_API_KEY`, `EMAIL_FROM` (verified sender domain).
- **Stripe (pending)** — `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`. Webhook target: `/api/stripe/webhook`. Needed for online invoice payments, plan upgrades, and Tap to Pay.
- **Anthropic (live)** — `ANTHROPIC_API_KEY` for SmartWrite / AI quote drafting / daily AI to-dos.
- **Other placeholders** — `XERO_CLIENT_ID/SECRET`, `GOOGLE_CLIENT_ID/SECRET` (real value present), `CLOUDFLARE_API_TOKEN`+`CLOUDFLARE_ZONE_ID` (+optional `CLOUDFLARE_SAAS_FALLBACK_HOSTNAME`), `INBOUND_EMAIL_SECRET`.

Mobile `tradiee-mobile/.env` + `eas.json` carry `EXPO_PUBLIC_*` equivalents (client-public, baked into builds).

## Features built

### Core workflow
**Enquiries** (+convert, dup-detection; sources incl. website, email inbox,
booking widget; **AI-draft-quote** from the convert dialog grounds line items
in the price list) → **Quotes** (builder with sections, price-list, kits,
optional sections + online accept/decline, per-line + document **discounts**,
per-line **tax**, **gross-profit** display, **save-as-template** /
new-from-template, public `/q/[token]`, email/SMS) → **Jobs** (list/board/map,
detail, **custom statuses**, assign to team member, **per-job tasks**,
recurring) → **Scheduling** (visits, Google Calendar sync) → **Invoicing**
(full/progress/actuals, line items + discounts + per-line tax + tax-inclusive
mode, payments incl. **Stripe**, **Xero** sync, recurring invoices, bulk
invoicing, email/SMS, public `/i/[token]`) → **Payments** → **Review request
email** auto-sent after paid.

### Sprint 3 (2026-06-22) — competitor-parity + UX polish, all on `main`

**Quick-action menus** — Tradify-style per-row `⋯` on Customers (→ New quote,
New job pre-filled) and Suppliers (→ New PO, New bill pre-filled). New
reusable `components/ui/row-actions.tsx`. `?customerId` / `?supplierId` are
plumbed through the relevant `/new` pages.

**Logo → accent picker (Settings)** — Canvas-based dominant-colour extractor
(`lib/extract-color.ts`) suggests an accent on logo upload. Also exposes
`--brand` CSS var separately from `--accent` so the global "+ New" button
stays on the company brand colour even on route-accented pages. Migration
**040** added `companies.theme_accent`.

**Automated review-request email on paid** — Migration **041**
(`companies.review_link`, `review_request_enabled`,
`invoices.review_request_sent_at`). `lib/review-request.ts maybeSendReviewRequest()`
is idempotent and called from both the Stripe webhook
(`payment_intent.succeeded`) and the in-app "Record payment" flow. Logs to
`communications`.

**Two-way SMS thread** — Migration **042** (`customer_messages`). Twilio
inbound webhook `/api/sms/inbound` matches sender phone to a customer.
Outbound `/api/sms/send`. Threaded bubble UI on `/customers/[id]` (15s polling,
owner/admin only). **TODO before going live: enable
`X-Twilio-Signature` verification in `/api/sms/inbound`.**

**Booking widget on website builder** — New `booking` website section type
with date + morning/afternoon time picker. Posts to the existing
`/api/site/lead` with `kind: 'booking'` — `source` is stamped accordingly so
owners can filter booking vs general enquiries. Preferred date/time stamped
into the enquiry description.

**SEO for Instant Website** — `proxy.ts` now path-preserves subdomain rewrites
so site-scoped routes work at the tenant's root. New `/sitemap.xml` +
`/robots.txt` per tenant. `generateMetadata` emits Open Graph, Twitter card,
and favicon from the company logo. **GBP sync stubbed** in `lib/gbp-sync.ts`
— Google Business Profile API needs manual approval we don't have yet.

**Tap to Pay scaffolding** — `/api/stripe/terminal/connection-token` +
`/api/stripe/terminal/payment-intent` (card_present, auto-capture). Mobile
side: `tradiee-mobile/lib/tap-to-pay.ts` with fetch helpers and a wiring
doc-comment. **Install pending: `@stripe/stripe-terminal-react-native` +
Apple's proximity-reader entitlement** before the iPhone flow works.

**Tab-accent + orange cleanup** — `bg-orange-500` etc. sweep across 43 files
→ `bg-[var(--accent,#f97316)]`. Quotes/Jobs/Invoices/Enquiries filter pills
now match the route accent (sky on customer-side routes, amber on supplier
routes, etc.).

**Settings reorg (beginner-friendly)** — Tabs now: **Business / Workflow /
Team / My profile / Integrations / Subscription**. Workflow owns the lists
(Job statuses, Tax rates, **Hourly rates** — renamed from "Billing rates"
because it collided with the subscription tab — Payment methods, Enquiry
inbox). Integrations tab gains live green-tick / amber-warning status cards
for Resend, Twilio, Stripe and Anthropic, showing exactly which env vars to
set.

**Website builder Theme card** — Shows uploaded logo as a click-to-sample
target. **Native EyeDropper** button (Chrome/Edge; feature-detected, hides
otherwise). **AI palette**: top-5 dominant colours from the logo as
one-click swatches (pure client-side, no API call). `extractPalette` +
`samplePixel` helpers in `lib/extract-color.ts`.

### Sprint 2 work (already on main)
**Projects (web, Team \$19/mo add-on)** — migration 039. Multi-stage projects
with PM, progress bar, money rollup; CRUD stages/contacts/subcontractors;
reassign jobs/invoices to a stage. Web-only — staff redirected to dashboard.

**Daily 6am AI to-do list** — migration 038 + `/api/daily-todos`. Per-user
todos from today's visits, quote follow-ups, overdue invoices, stale
enquiries, 7d+ stalled jobs. Persists incompletes (yesterday rolls forward),
auto-completes when source resolves, manually-completed never resurrected.

**AI rewrite + AI-draft-quote** — `/api/ai/rewrite` (tone presets) +
`/api/ai/draft-quote` (price-list-grounded, server-side re-validated).
`AIRewriteButton` on the New Enquiry modal; existing `SmartWriteButton`
elsewhere.

**Seat-cap upgrade prompts** — `lib/plans.ts` is the single source of truth
(trial/solo/team/pro + maxSeats + monthly). Invite + breach → confirm()
→ `/api/billing/change-plan` → invite. Server guard at `/api/auth/invite`.

**Global +New + Cmd/Ctrl-K search** — `/api/search` merges
jobs/customers/quotes/invoices (RLS-scoped). `GlobalSearch` palette + `NewMenu`.

**Mobile RBAC + custom statuses** — sync streams parameterised by
`profiles.role` + assigned jobs. Mobile tab nav hides Quotes/Invoices for
staff. Jobs list / detail / map all read per-company `job_statuses` via
`tradiee-mobile/lib/job-statuses.ts`.

**Mobile complete-and-signature** — WebView signature pad →
`/api/storage/signature` stores PNG as a job photo, then sets job to the
company's terminal status.

### Design system (Monday.com-inspired)
- **Font**: Figtree via `next/font`, exposed as Tailwind v4 `font-sans`.
- **Sidebar**: light shell. Each nav group owns a soft pastel hover gradient
  and a saturated active gradient.
- **CSS variables**:
  - `--accent` — route accent on mapped routes (sky on Customers/Jobs/Quotes
    etc., amber on Suppliers/POs/Bills, violet on Admin/Settings); falls
    back to `--brand` on unscoped routes.
  - `--brand` — the company's chosen theme accent (companies.theme_accent),
    drives the global "+ New" button and unscoped pages. Falls back to
    orange (`#f97316`) when unset.
  - `--accent-hover`, `--accent-soft`, `--accent-soft-text`, `--accent-ring`,
    `--brand-hover` derived in `DashboardShell`.
- `Button` default variant + focus rings consume the vars. Sprint 3
  finished the migration — there are now zero `bg-orange-500` /
  `text-orange-600` / `border-orange-500` literals in `app/(dashboard)` or
  `components/`.

### Everything else (pre-existing)
- **Instant Website builder** (`/website`): editable sections, theme
  colour+font, slug, SEO, logo. Public at `{slug}.industryforms.app`
  (proxy Host-rewrite → `/site/[slug]` — now path-preserving). Publish gated
  behind \$9/mo "website" Stripe add-on. **Custom domains** via
  Cloudflare-for-SaaS.
- **Discounts** + **configurable tax** centralised in `lib/pricing.ts`.
- **Role-based access** (migration 031): staff see only assigned jobs + own
  time/travel; quotes/invoices/payments/suppliers/POs/bills/enquiries
  owner-admin only.
- **Custom job statuses** (migration 037). **Reference fields** + doc number
  prefixes. **Recurring jobs/invoices**, **job templates**, **service reminders**,
  **quote templates**.
- **Customer communications history**. **Enquiry email inbox**
  (`/api/inbound/email`).
- Customers + multi-site (geocode-on-save), **Job Map** (web Leaflet),
  **Timesheets** (+travel logs), Job costing, Materials (+AI supplier-invoice
  parser "SmartRead"), **SmartWrite** + **VoiceFill**, Price list (+CSV
  import, low-stock), Suppliers/POs/Bills (AP), Forms/Compliance (NZ
  PS1–PS4, electrical certs), To-Do, Reports, Subcontractor invites,
  Customer portal (`/portal`), photos (R2), 28-day trial + paywall,
  super-admin + billing-exempt, **dunning cron** (`/api/reminders`).

### Mobile (Expo)
Tabs: Jobs (My/All), Map, Invitations, Schedule, **Quotes/Invoices (admin
only)**, Customers, Timesheets, More. Lists read **direct Supabase**; detail
screens use **PowerSync** `useQuery`; photos via presigned R2.
- **Job detail**: tap-to-call phone, tap-to-map address, custom-status
  badge + picker, **Complete job & get sign-off**.
- **Timesheets**: auto GPS travel logbook → allocate trips
  (Personal/Ignore/Work→job).
- **Tap to Pay** (scaffolding only — see Sprint 3 above).

## Migrations (supabase/migrations/) — all 043 applied to cloud
001–021 base schema. **022** PowerSync. **023** billing_exempt. **024**
visit reminder_sent_at. **025** suppliers/POs. **026** bills. **027** invoice
last_reminder_at. **028** company_websites. **029** cf_hostname_id. **030**
discounts. **031** role-based access. **032** reference + doc prefixes +
recurring jobs + job_templates + service_reminders. **033** payment_methods +
billing_rates + recurring invoices + doc branding. **034** configurable tax.
**035** job_tasks. **036** document_templates + communications +
inbound_email_token. **037** custom job statuses. **038** auto-generated todos.
**039** projects + project_stages + project_contacts + project_subcontractors
+ jobs/invoices.project_id/project_stage_id + companies.addons. **040**
companies.theme_accent. **041** review_link + review_request_enabled +
invoices.review_request_sent_at. **042** customer_messages. **043**
profiles.vehicle_registration.

## Key decisions & gotchas
- **Next 16** uses `proxy.ts` (not `middleware.ts`) + `allowedDevOrigins` in
  `next.config.ts`. Read `node_modules/next/dist/docs/` per
  `tradiee-app/AGENTS.md`. `proxy.ts` now **path-preserves** when rewriting
  subdomains/custom-domains → `/site/[slug]/<path>`.
- **PowerSync sync streams (edition 3)**: data queries must use **simple
  equality** with JOINs — no `IN ('owner','admin')` literal lists. Use
  `auth.user_id()` (not `request.user_id()`). The current `sync-rules.yaml`
  is the canonical example.
- **Turbopack dev manifest** on the slow D: drive sometimes returns 404 for
  all `/api/*` routes from a stale manifest. Restart the dev server.
- **Supabase clients must share the session** — use
  `@/lib/supabase/browser`/`server`, not a fresh `@supabase/supabase-js`.
- **PostgREST to-one embeds infer as arrays** under the typed client —
  cast `as unknown as {…} | null`.
- **Lucide icon name collisions**: `import { Map }` shadows JS `Map` —
  use a Record/`Object.fromEntries`.
- **Server → client component boundary**: passing icon components
  (`icon: FileText`) across the boundary throws. Pass rendered elements
  (`icon: <FileText />`) instead — `RowActions` already enforces this in
  its type.
- **ESLint**: React-Compiler rules set to **warn**. `next build` fails on
  errors only.
- **Mobile npm installs need `--legacy-peer-deps`**.
- **Paywall** in `app/(dashboard)/layout.tsx` via `lib/billing.ts hasAccess()`.
- **Tax math** lives only in `lib/pricing.ts`.
- **Tailwind v4** JIT won't see template-string-concatenated classes — store
  full literal class strings on data objects.
- **Plans** in `lib/plans.ts`. Add-ons are JSONB on `companies.addons`,
  keyed by slug — `lib/billing.ts hasAddon()`.

## How to run / verify
- **Web dev**: `npm run dev` in `tradiee-app` (port 3000) — talks to cloud
  Supabase/R2. First `/api/*` request can take 60s+ to compile on the slow
  D: drive.
- **Type-check**: `cd tradiee-app && npx tsc --noEmit` (and same in
  `tradiee-mobile`). **Lint**: `npx eslint .`. **Before pushing to `main`**
  (auto-deploys): `npx next build`.
- **DB**: `supabase db push`. One-off DB scripts: `node --env-file=.env.local
  <x>.mjs` with `@supabase/supabase-js` + secret key.
- **Commits** end with `Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>`.

## Accounts
- **E2E test** (exists): `claude-e2e-20260620@grimstock.co.nz` /
  `SmokeTest1234`, company "E2E Test Co". Safe to delete.
- To create: **owner/super-admin** `admin@industryforms.co.nz` (then `update
  profiles set is_super_admin=true …`); **app-store review**
  `test@industryforms.co.nz` (set its `companies.billing_exempt=true`).

## Outstanding / next steps

### Imminent (before going fully live)
1. **Resend** — set `RESEND_API_KEY` + `EMAIL_FROM` in Vercel, then redeploy.
   Quote/invoice/reminder/review-request emails all no-op cleanly until this
   is set. Settings → Integrations shows the live status.
2. **Stripe** — set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`,
   `STRIPE_WEBHOOK_SECRET`. Webhook target: `/api/stripe/webhook`. Create
   Stripe prices including `website_monthly` (\$9/mo) and `projects_monthly`
   (\$19/mo). Without this: online invoice pay + plan upgrades + Tap to Pay
   are all dark.
3. **Twilio inbound signature verification** — currently disabled in
   `/api/sms/inbound` (see TODO). Verify `X-Twilio-Signature` before going
   live so the webhook can't be spoofed.
4. **Wildcard domain `*.industryforms.app`** in Vercel + DNS for free
   per-tenant website subdomains.
5. **Cloudflare for SaaS** — `CLOUDFLARE_API_TOKEN`+`CLOUDFLARE_ZONE_ID`
   (+ optional `CLOUDFLARE_SAAS_FALLBACK_HOSTNAME`) for website custom domains.
6. **Stripe webhook handler for Projects add-on** — `/api/billing/addon`
   currently flips `companies.addons.projects.active` directly. Fine for
   dev/super-admin; needs a Stripe checkout + webhook for prod.

### Building next
The user has flagged the next sprint will be on **the website / public
marketing site** (industryforms.app — different from the tenant Instant
Websites). No work started yet; brief expected next session.

### Future backlog (in priority order)
- **Tap to Pay finish** — install `@stripe/stripe-terminal-react-native` in
  the mobile app, get Apple's proximity-reader entitlement, wire the
  collect-confirm flow per `tradiee-mobile/lib/tap-to-pay.ts`.
- **Pricing levels** (per-customer-group pricing). **MYOB/QuickBooks** sync
  (have Xero). **Reminder-cron comms logging** (manual sends are logged;
  cron sends aren't). **Invoice templates** standalone (currently lean on
  recurring invoices).
- **Mobile Projects view** — projects feature is web-only by spec, but
  field crews seeing the stage they're on would help.
- **Google Business Profile sync** — stubbed in `lib/gbp-sync.ts`. Needs
  Google to approve API access before wiring.
- **Per-screen accent on remaining chips/pills** — most done in sprint 3,
  but spot-check on edge pages.

## Memory (auto-loaded each session, at `C:\Users\User\.claude\projects\D--TRADIEE\memory\`)
- `project-overview.md`, `tech-stack.md`, `build-state.md`,
  `feedback_nextjs16_allowedDevOrigins.md`, `gotcha_turbopack_stale_api_404.md`,
  `tradify-parity-backlog.md`.
