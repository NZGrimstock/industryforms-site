# IndustryForms — Project State (handoff)

Last updated: 2026-06-22. Catch-up doc for a fresh session. Read this first.

## What it is
**IndustryForms** — a SaaS job-management app for NZ/AU tradespeople (a Tradify
competitor). Monorepo at `D:\TRADIEE`:
- `tradiee-app/` — **Next.js 16** web app (App Router, Turbopack)
- `tradiee-mobile/` — **Expo SDK 56** mobile app (bare workflow, native `android/` dir)
- `supabase/migrations/` — database migrations (001–037)
- Root docs: this file, `POWERSYNC_SETUP.md`, `R2_SETUP.md`, `SUPABASE_CLOUD_MIGRATION.md`, `VERCEL_DEPLOY.md`, `sync-rules.yaml`

GitHub: **https://github.com/NZGrimstock/industryforms** (branch `main`, auto-deploys to Vercel). Latest commit `f3c031b` (custom job statuses).

## Live infrastructure (all provisioned)
| Piece | Detail |
|---|---|
| **Supabase** | Cloud project ref `cfltbpwrojtlpkjvresd` (Sydney/SEA). **New API keys**: publishable (client) + secret (server) — NOT legacy anon/service_role. All 37 migrations applied. |
| **Web hosting** | **Vercel**, custom domain **app.industryforms.app**. Vercel **Root Directory = `tradiee-app`**, **Framework Preset = Next.js**. `tradiee-app/vercel.json` defines the daily cron. |
| **Storage** | **Cloudflare R2** (S3-compatible), account `2def11afa315cff05e64926573b3191f`. Buckets: `industry-forms-public` (logos, job photos — via **cdn.industryforms.app**) and `industry-forms` (private compliance PDFs via presigned URLs). |
| **Offline sync** | **PowerSync** `https://6a33b406deeddd0df605d498.powersync.journeyapps.com`, connected to cloud DB, JWKS auth via Supabase. Working. `sync-rules.yaml` uploaded. |
| **Mobile** | Expo `@grimstock/industryforms` (EAS, logged in as `grimstock`). APK builds via **local Gradle**: `cd tradiee-mobile/android && ./gradlew assembleRelease --no-daemon` → `app/build/outputs/apk/release/app-release.apk` (debug-signed, installable). JDK 17 + Android SDK present; `local.properties` has `sdk.dir`. Don't run release builds back-to-back — flaky `packageRelease` lock errors; if it fails run `./gradlew clean assembleRelease`. |

## Env vars (NEVER commit real secret values)
Web `tradiee-app/.env.local` (mirror non-secret ones in **Vercel**):
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`
- `R2_ACCOUNT_ID`, `R2_PUBLIC_BUCKET`, `R2_PRIVATE_BUCKET`, `R2_PUBLIC_*`/`R2_PRIVATE_*` keys, `NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://cdn.industryforms.app`
- `NEXT_PUBLIC_APP_URL=https://app.industryforms.app`, `NEXT_PUBLIC_POWERSYNC_URL`, `CRON_SECRET`
- **Placeholders — features no-op/gate gracefully until set:** `RESEND_API_KEY`+`EMAIL_FROM`; `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER`; `STRIPE_*`; `XERO_CLIENT_ID`/`SECRET`; `GOOGLE_CLIENT_ID`/`SECRET` (real value present); `ANTHROPIC_API_KEY`; `CLOUDFLARE_API_TOKEN`+`CLOUDFLARE_ZONE_ID` (+optional `CLOUDFLARE_SAAS_FALLBACK_HOSTNAME`) for website custom domains; `INBOUND_EMAIL_SECRET` for the enquiry email inbox.

Mobile `tradiee-mobile/.env` + `eas.json` carry `EXPO_PUBLIC_*` equivalents (client-public, baked into builds).

## Features built

### Core workflow
**Enquiries** (+convert, dup-detection; sources incl. website + email inbox) → **Quotes** (builder with sections, price-list, kits, optional sections + online accept/decline, per-line + document **discounts**, per-line **tax**, **gross-profit** display, **save-as-template** / new-from-template, public `/q/[token]`, email/SMS) → **Jobs** (list/board/map, detail, **custom statuses**, assign to team member, **per-job tasks**, recurring) → **Scheduling** (visits, Google Calendar sync) → **Invoicing** (full/progress/actuals, line items + discounts + per-line tax + tax-inclusive mode, payments incl. **Stripe**, **Xero** sync, recurring invoices, bulk invoicing, email/SMS, public `/i/[token]`) → **Payments**.

### Everything else
- **Instant Website builder** (`/website`): editable sections (hero/about/services/gallery-from-job-photos/testimonials/contact), theme colour+font, slug, SEO, logo auto-insert. Public at free subdomain `{slug}.industryforms.app` (proxy Host-rewrite → `/site/[slug]`) and `/site/[slug]`. Contact form → enquiry via `/api/site/lead`. Publish gated behind **$9/mo "website" Stripe add-on** (lookup key `website_monthly`; webhook flips `company_websites.subscription_active`; super-admin/billing-exempt bypass). **Custom domains** code-complete via Cloudflare-for-SaaS (`lib/cloudflare.ts`, `/api/website/domain`). DB-backed sections (JSONB) + Next SSR (not static).
- **Discounts** ($ or %), **configurable tax** (per-company `tax_rates`, per-line `tax_rate`, **tax-inclusive** mode `companies.prices_include_tax`) — math centralized in `lib/pricing.ts` (`lineNet`, `computeTaxedTotals`). NZ 15% / AU 10% both supported (GST-free lines etc.).
- **Role-based access** (migration 031): staff see only assigned jobs + own time/travel; quotes/invoices/payments/suppliers/POs/bills/enquiries/comms owner-admin only. Web + mobile nav gated. (Mobile PowerSync still syncs all company data — see caveats.)
- **Custom job statuses** (migration 037): `jobs.status` is text; per-company `job_statuses` table (label/colour/order/terminal). Drives board columns, list filters, badges, status picker. Managed in Settings. `lib/job-statuses.ts`.
- **Settings**: Company (logo, GST, **doc number prefixes**, **payment instructions/footers**, **tax-inclusive toggle**), Profile, Team, **Integrations** tab (Google Calendar, Xero, Import wizard), Billing (plan). Plus managers: **tax rates**, **billing rates**, **payment methods**, **job statuses**, **enquiry email-inbox address**.
- **Reference field** on jobs/quotes/invoices (entry + columns + search). **Configurable doc numbering** (`lib/numbering.ts`). **Tabbed + searchable + sortable list views** (quotes/invoices/jobs) via `ListSearch` + `SortHeader`.
- **Recurring jobs** + **job templates** + **service reminders** (jobs sub-tabs `panels.tsx`; cron generates them). **Recurring invoices** + **bulk invoicing** (`/invoices/bulk`). **Quote templates** (`document_templates`). **Onboarding checklist** on dashboard.
- **Customer communications history** (`communications` table; outbound email/SMS logged via `lib/comms.ts`; shown on customer page). **Enquiry email inbox** (`/api/inbound/email` webhook → enquiry; per-company `inbound_email_token`).
- Customers + multi-site (geocode-on-save), **Job Map** (web Leaflet), **Timesheets** (+travel logs), Job costing, Materials (+AI supplier-invoice parser = "SmartRead"), **SmartWrite** + **VoiceFill** (editable transcript fallback), Price list (+CSV import, low-stock), Suppliers/POs/Bills(AP), Forms/Compliance (NZ PS1–PS4, electrical certs), To-Do, Reports, Subcontractor invites, Customer portal (`/portal`), photos (R2), 28-day trial + paywall (`/upgrade`), super-admin + billing-exempt, **dunning cron** (`/api/reminders`).

### Mobile (Expo)
Tabs: Jobs (My/All), **Map** (new — Leaflet/OSM WebView, My/All, tap-to-Call + Directions, lists jobs without coords as "Not on map"), Invitations, Schedule, Quotes, Invoices, Customers, Timesheets. Lists read **direct Supabase**; detail screens use **PowerSync** `useQuery`; photos via presigned R2. **Job detail**: tap-to-call phone, tap-to-map address (Apple Maps / `geo:`, uses geocoded site coords; mobile `jobs` schema syncs `site_id`). **Timesheets**: auto GPS travel logbook (`lib/location/tracking.ts`) → allocate trips (Personal/Ignore/Work→job).

## Migrations (supabase/migrations/) — all applied to cloud
001–021 base schema. **022** PowerSync (`company_id` + triggers + publication). **023** billing_exempt. **024** visit reminder_sent_at. **025** suppliers/POs. **026** bills. **027** invoice last_reminder_at. **028** company_websites. **029** cf_hostname_id. **030** discounts. **031** role-based access (RLS). **032** reference fields + doc prefixes + recurring jobs + job_templates + service_reminders. **033** payment_methods + billing_rates + recurring invoices + doc branding. **034** configurable tax (tax_rates, per-line tax_rate, prices_include_tax). **035** job_tasks. **036** document_templates + communications + inbound_email_token. **037** custom job statuses (status enum→text + job_statuses). New ones: `supabase db push` (project linked).

## Key decisions & gotchas
- **Next 16** uses `proxy.ts` (not `middleware.ts`) + `allowedDevOrigins` in `next.config.ts`. Read `node_modules/next/dist/docs/` per `tradiee-app/AGENTS.md`. `proxy.ts` also handles website subdomain + custom-domain Host→tenant rewrites.
- **Supabase clients must share the session** — use `@/lib/supabase/browser`/`server`, not a fresh `@supabase/supabase-js` client.
- **PostgREST to-one embeds infer as arrays** under the typed client — cast `as unknown as {…} | null`.
- **Lucide `Map`/icon name collisions**: `import { Map }` shadows JS `Map` — use a Record/`Object.fromEntries`, not `new Map()`, in files importing the icon.
- **ESLint**: React-Compiler rules set to **warn** (they flag valid server-component/effect code). `next build` fails on errors only — keep errors 0; the `set-state-in-effect`/`immutability` *warnings* are expected. Lazy-init SDK clients (`lib/stripe.ts getStripe()`, Anthropic in handlers, `lib/cloudflare.ts`).
- **Mobile npm installs need `--legacy-peer-deps`** (expo-router/radix peer conflict). To add a native dep: `npm install <pkg> --legacy-peer-deps` then rebuild APK (autolinking).
- **Geocoding**: once on site save (`lib/geocode.ts`, Nominatim) → `customer_sites.lat/lng`. `scripts/geocode-sites-backfill.mjs` backfills.
- **Paywall** in `app/(dashboard)/layout.tsx` via `lib/billing.ts hasAccess()`.
- **Tax math** lives only in `lib/pricing.ts` — change it there. NULL line `tax_rate` → company default rate (back-compat).

## How to run / verify
- **Web dev**: `npm run dev` in `tradiee-app` (port 3000) — talks to cloud Supabase/R2.
- **Type-check**: `cd tradiee-app && npx tsc --noEmit` (and same in `tradiee-mobile`). **Lint**: `npx eslint .` (errors 0; warnings ok). **Before pushing to `main`** (auto-deploys): `npx next build`.
- **DB**: `supabase db push`. One-off DB scripts: `node --env-file=.env.local <x>.mjs` with `@supabase/supabase-js` + secret key (delete temp scripts after).
- **Commits** end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Push `main` → Vercel deploys.

## Accounts
- **E2E test** (exists): `claude-e2e-20260620@grimstock.co.nz` / `SmokeTest1234`, company "E2E Test Co". Safe to delete.
- To create: **owner/super-admin** `admin@industryforms.co.nz` (then `update profiles set is_super_admin=true …`); **app-store review** `test@industryforms.co.nz` (set its `companies.billing_exempt=true`).

## To go fully live (set in Vercel, then redeploy)
`RESEND_API_KEY`+`EMAIL_FROM`, `TWILIO_*`, `STRIPE_*` (+ create Stripe prices incl. `website_monthly` @ $9/mo), `CRON_SECRET` (enables the daily `/api/reminders` cron — dunning, appointment reminders, recurring jobs/invoices, service reminders), `*.industryforms.app` **wildcard domain** in Vercel + DNS (free website subdomains), `CLOUDFLARE_API_TOKEN`+`CLOUDFLARE_ZONE_ID` (website custom domains), `INBOUND_EMAIL_SECRET` + email-provider inbound webhook → `/api/inbound/email` (enquiry inbox).

## Outstanding / next steps
> **⚠ ACTION REQUIRED after the latest changes:** `sync-rules.yaml` was rewritten
> into role-aware buckets (owner/admin = full company; staff = assigned jobs + own
> time only). **Re-upload it via the PowerSync Dashboard → Sync Rules** for mobile
> RBAC to take effect — editing the file alone does nothing until uploaded.

1. ~~**Mobile RBAC**~~ ✅ Done in code: `sync-rules.yaml` parameterized by `profiles.role`
   + assigned jobs; mobile tab nav hides Quotes/Invoices for `staff`. *(Upload sync rules — see above.)*
2. ~~**Mobile custom statuses**~~ ✅ Done: mobile reads `job_statuses` (jobs list, job
   detail picker, map active-filter) via `lib/job-statuses.ts` with default fallback.
3. **Workflow polish (user's #1 — "fewer clicks")**: (a) ✅ global **"+ New" + Cmd/K search**
   in the header (`/api/search`, `global-search.tsx`, `new-menu.tsx`); (b) ✅ job page is
   already a unified Job Card; (c) ✅ inline **status** editing on the jobs list
   (`components/jobs/inline-status.tsx`) — *inline assignee/create-invoice from rows still TODO*;
   (d) ✅ one-click **Complete & invoice** on the Job Card — *accept→job→auto-schedule still TODO*;
   (e) ✅ mobile **Complete job + customer signature** (WebView pad → `/api/storage/signature`
   stores sign-off as a job photo). Remaining: inline assignee/invoice on list rows, accept→schedule chain.
4. **UI refresh (user's #2 — "cleaner/fresher")**: dashboard stat cards modernized. Broader
   **design-system pass** (card radius/shadow, spacing scale, type hierarchy, sparing orange,
   refined neutrals) + mobile card/typography refresh still pending — **wants sign-off on
   direction first** (mock up Job Card + dashboard before a full pass).
5. **Reminder-cron comms logging** (manual sends are logged; cron sends aren't). **Invoice templates** standalone (currently lean on recurring invoices). **Pricing levels** (per-customer-group pricing). **MYOB/QuickBooks** sync (have Xero).
6. Create admin + test accounts; run geocode backfill if importing existing sites.

Latest work lives on branch **`feature/outstanding-backlog`** (not yet merged/pushed).

## Memory (auto-loaded each session, at `C:\Users\User\.claude\projects\D--TRADIEE\memory\`)
- `project-overview.md`, `tech-stack.md`, `build-state.md`, `feedback_nextjs16_allowedDevOrigins.md`, **`tradify-parity-backlog.md`** (full feature-parity status — every Tradify checklist item is now built except where noted).
