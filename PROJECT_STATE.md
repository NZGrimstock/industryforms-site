# IndustryForms — Project State (handoff)

Last updated: 2026-06-20. This is the catch-up doc for a fresh session.

## What it is
**IndustryForms** — a SaaS job-management app for NZ/AU tradespeople (a Tradify
competitor). Monorepo at `D:\TRADIEE`:
- `tradiee-app/` — **Next.js 16** web app (App Router, Turbopack)
- `tradiee-mobile/` — **Expo SDK 56** mobile app (iOS/Android)
- `supabase/migrations/` — database migrations (001–027)
- Root docs: this file, `POWERSYNC_SETUP.md`, `R2_SETUP.md`, `SUPABASE_CLOUD_MIGRATION.md`, `VERCEL_DEPLOY.md`, `sync-rules.yaml`

GitHub: **https://github.com/NZGrimstock/industryforms** (branch `main`, auto-deploys to Vercel).

## Live infrastructure (all provisioned)
| Piece | Detail |
|---|---|
| **Supabase** | Cloud project ref `cfltbpwrojtlpkjvresd` (Sydney/SEA). Uses **new API keys**: publishable (client) + secret (server) — NOT legacy anon/service_role. All 27 migrations applied. |
| **Web hosting** | **Vercel**, custom domain **app.industryforms.app**. Vercel **Root Directory = `tradiee-app`**, **Framework Preset = Next.js** (both were gotchas — see below). |
| **Storage** | **Cloudflare R2** (S3-compatible), account `2def11afa315cff05e64926573b3191f`. Two buckets: `industry-forms-public` (logos, job photos — served via **cdn.industryforms.app**) and `industry-forms` (private, compliance PDFs via presigned URLs). Each bucket has its own API token. |
| **Offline sync** | **PowerSync** instance `https://6a33b406deeddd0df605d498.powersync.journeyapps.com`, connected to the cloud DB, JWKS auth via Supabase. **Working** (verified syncing). `sync-rules.yaml` uploaded. |
| **Mobile** | Expo project `@grimstock/industryforms` (EAS). Logged in as `grimstock`. APK builds via local Gradle (`tradiee-mobile/android`, JDK 17, Android SDK) — EAS free-tier monthly quota was exhausted (resets ~1st of month). |

## Env vars (NEVER commit real secret values)
Web `tradiee-app/.env.local` (and mirror non-secret ones in **Vercel**):
- `NEXT_PUBLIC_SUPABASE_URL=https://cfltbpwrojtlpkjvresd.supabase.co`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (client), `SUPABASE_SECRET_KEY` (server)
- `R2_ACCOUNT_ID`, `R2_PUBLIC_BUCKET=industry-forms-public`, `R2_PRIVATE_BUCKET=industry-forms`, `R2_PUBLIC_ACCESS_KEY_ID`/`R2_PUBLIC_SECRET_ACCESS_KEY`, `R2_PRIVATE_ACCESS_KEY_ID`/`R2_PRIVATE_SECRET_ACCESS_KEY`, `NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://cdn.industryforms.app`
- `NEXT_PUBLIC_APP_URL=https://app.industryforms.app`, `NEXT_PUBLIC_POWERSYNC_URL`, `CRON_SECRET`
- Integrations (currently **placeholders** — features no-op until set): `RESEND_API_KEY`+`EMAIL_FROM` (email), `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` (SMS), `STRIPE_*`, `XERO_CLIENT_ID`/`SECRET`, `GOOGLE_CLIENT_ID`/`SECRET` (real value present), `ANTHROPIC_API_KEY`.

Mobile `tradiee-mobile/.env` + `eas.json` env block carry the `EXPO_PUBLIC_*` equivalents (all client-public; baked into builds via `eas.json`).

## Features built (web unless noted)
Core workflow: **Enquiries** (+convert, dup-detection) → **Quotes** (builder, sections, price-list, kits, PDF, public `/q/[token]`, email/**SMS**, accept/decline) → **Jobs** (list/board/**map**, detail, status, **assign to team member**) → **Scheduling** (visits, Google Calendar) → **Invoicing** (full/progress/**actuals**, line items, payments, **Stripe**, **Xero** sync, email/**SMS**, public `/i/[token]`) → **Payments**.

Plus: **Customers** + multi-site (with **geocode-on-save** lat/lng), **Job Map** (Leaflet, stored coords, team-member filter, click-to-call), **Timesheets** (web+mobile, travel logs), **Job costing**, **Materials** (+ AI supplier-invoice parser), **Price list** (+CSV import, low-stock), **Suppliers** + **Purchase Orders** + **Bills (AP)**, **Forms/Compliance** (NZ PS1–PS4, electrical certs), **To-Do**, **Reports**, **Subcontractor invites**, **Customer portal** (`/portal`), **photos** (R2), **28-day trial + paywall** (`/upgrade`), **super-admin** + **billing-exempt** bypass, **SMS reminders** + **automated dunning** (cron `/api/reminders`).

Mobile: tabs (Jobs w/ "My jobs/All", Quotes, Invoices, Customers, Timesheets, Invitations, Schedule) read **direct Supabase**; detail screens use **PowerSync** `useQuery`; photo upload via presigned R2 (through web API).

## Migrations (supabase/migrations/)
001–021 base schema. **022** PowerSync (`company_id` on child tables + triggers + `powersync` publication). **023** `companies.billing_exempt`. **024** `job_visits.reminder_sent_at`. **025** suppliers + purchase_orders + items. **026** bills. **027** `invoices.last_reminder_at`. Run new ones with `supabase db push` (project is linked).

## Key decisions & gotchas (the things that bit us)
- **Next 16** uses `proxy.ts` (not `middleware.ts`) and `allowedDevOrigins` in `next.config.ts` (needed for non-localhost dev origins, else JS is blocked). Read `node_modules/next/dist/docs/` per `tradiee-app/AGENTS.md`.
- **Supabase clients must share the session.** Web uses `@supabase/ssr` (cookies). The PowerSync connector and all clients must use `@/lib/supabase/browser` / `server`, NOT a fresh `@supabase/supabase-js` client (that has no session → "Not signed in").
- **PostgREST to-one embeds infer as arrays** under the typed client — cast `as unknown as {…} | null`.
- **ESLint**: the React-Compiler rules (`react-hooks/purity`, `set-state-in-effect`, `immutability`, `refs`) are set to **warn** in `eslint.config.mjs` (they flag valid code incl. server components). `next build` fails on errors; keep errors at 0. Lazy-init SDK clients (Stripe, Anthropic) so missing keys don't break the build.
- **Lazy provider clients**: `lib/stripe.ts` `getStripe()`; Anthropic created inside handlers.
- **Mobile (Expo)** is bare workflow — has a native `android/` dir. Build APK locally: `cd tradiee-mobile/android && ./gradlew assembleRelease` (output `app/build/outputs/apk/release/app-release.apk`, debug-signed → installable). `local.properties` is gitignored.
- **Geocoding** (Job Map): geocode **once on site save** (`lib/geocode.ts`, Nominatim) → store `customer_sites.lat/lng`. Map reads stored coords; `scripts/geocode-sites-backfill.mjs` backfills existing sites.
- **Paywall** in `app/(dashboard)/layout.tsx` via `lib/billing.ts hasAccess()`: blocked when trial expired + no active sub, unless `is_super_admin` or `companies.billing_exempt`.

## Accounts
- **Owner/super-admin** to create: `admin@industryforms.co.nz` — sign up via UI, then `update profiles set is_super_admin=true where id=(select id from auth.users where email='admin@industryforms.co.nz');`
- **App-store review** to create: `test@industryforms.co.nz` — sign up, then set `companies.billing_exempt=true` for its company (never paywalled).
- **E2E test account** (exists, used for verification): `claude-e2e-20260620@grimstock.co.nz` / `SmokeTest1234`, company "E2E Test Co". Safe to delete.

## How to run / verify
- **Web dev**: preview tools or `npm run dev` in `tradiee-app` (port 3000). `.claude/launch.json` config name `tradiee-app` (cwd set to subfolder). On localhost it talks to **cloud** Supabase/R2.
- **Type-check**: `npx tsc --noEmit` in each app. **Lint**: `npx eslint .` (keep errors 0).
- **DB**: `supabase db push` (linked to cloud). One-off DB tests: `node --env-file=.env.local <script>.mjs` with `@supabase/supabase-js` + the secret key (delete temp scripts after).
- **Commits** end with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`. Push to `main` → Vercel deploys.

## Outstanding / next steps
1. **Provider keys** so reminders/SMS/email/billing actually send: set `RESEND_API_KEY`, `TWILIO_*`, `STRIPE_*` in Vercel.
2. **Schedule the dunning cron**: something must POST `/api/reminders` daily with header `x-cron-secret: <CRON_SECRET>` (Vercel Cron / GitHub Action / external). Drives quote follow-ups, overdue dunning, appointment SMS. **Not yet wired.**
3. **Mobile APK rebuild** to pick up the live PowerSync URL + latest features.
4. Create the **admin** + **test** accounts (above).
5. Remaining Tradify gaps (lower priority): MYOB/QuickBooks accounting (have Xero), Instant Website builder, distinct Work Orders.
6. Run `scripts/geocode-sites-backfill.mjs` once in prod so existing sites get coordinates.
