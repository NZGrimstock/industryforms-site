# TradeHub — Project Brief

> Working name. A NZ/AU trade job management SaaS — a Tradify (tradifyhq.com) competitor with better usability. This doc is the handoff context for continuing the build in Claude Code.

## What this is

Tradify is the dominant job management app for NZ/AU tradespeople (electricians, plumbers, builders, HVAC). Core loop: enquiry → quote → job → schedule → timesheet → invoice → paid, synced to Xero/MYOB. ~$49/mo solo, ~$65 + $35/user for teams.

Goal: build a competing product for the same market, targeting general trades (not a single-trade niche), with deliberately better usability in the areas where Tradify gets criticized.

## Where Tradify is weak (our wedge)

- Inventory management is weak — no real stock-level tracking
- Reporting is limited; automation gaps in scheduling
- No offline access; app pages can be slow to load
- No two-way Google Calendar sync (export-only)
- Outgoing quote/invoice emails carry a "sent from Tradify" footer
- Reviewers note pushy sales tactics around discount deadlines — a transparent, no-pressure pricing stance is a trust differentiator in a small market

Design decisions below target these directly. Don't lose sight of them when building UI — "simplified but complete" is the brief, not "fewer features than Tradify."

## Tech stack

- **Next.js** (App Router) — same framework as the existing easy-cards project for consistency
- **Supabase** — Postgres + Auth + Storage + Realtime. Multi-tenancy enforced via Postgres RLS, not application-layer checks
- **Stripe** — both the app's own subscription billing AND the "customer pays their invoice online" feature (one integration, two jobs)
- **Xero/MYOB sync** — explicitly deferred. Schema has integration points (`external_system`, `external_id`, `external_synced_at` on invoices) so this slots in later without a migration. Do not start this until core workflow is solid.

## Current state

Two migration files exist and have been validated against a real Postgres instance (tables create cleanly, RLS correctly isolates tenants, cross-tenant writes are blocked):

- `001_initial_schema.sql` — full schema, 19 tables
- `002_rls_policies.sql` — RLS policies for every table

These should be copied into `supabase/migrations/` in the new project and are ready to run as-is.

### Schema overview

**Tenancy & people**: `companies` (the paying customer — a trade business), `profiles` (staff, extends `auth.users`, role = owner/admin/staff), `customers` (the trade's own clients), `customer_sites` (a customer can have multiple job-site addresses, with access notes — gate codes, dogs, parking).

**Catalogue**: `price_list_items` (materials/labour with cost price, sell price, optional `quantity_on_hand` for real inventory tracking), `kits` + `kit_items` (reusable bundles like "install double powerpoint").

**Quote → Job → Invoice spine**:
- `quotes` → `quote_sections` (optional/selectable sections) → `quote_line_items` (normalized against price list, not free text — this is what makes margin reporting actually work)
- `jobs` → `job_visits` (deliberately separate from jobs, so one job can have many scheduled visits without duplicating job data — this is the structural fix for Tradify's scheduling gap), plus `job_notes`, `job_photos`
- `timesheets` (linked to job + visit + profile, snapshots bill/cost rate at time of entry)
- `invoices` → `invoice_line_items` → `payments` (supports progress invoicing via `is_progress_invoice` / `progress_sequence`)
- `reminders` (quote follow-ups, invoice overdue nudges, appointment reminders)

**Notable design choices**:
- `recurrence_rule` on jobs uses standard iCal RRULE syntax, not a bespoke format — more flexible than Tradify's recurring jobs, and there are existing libraries to parse it (`rrule.js`)
- `public_token` (uuid) on quotes and invoices enables tokenless customer-facing links (view/accept a quote, pay an invoice) without forcing account creation. These must be handled via a server-side function/route with `security definer`, NOT via RLS — the customer has no `auth.uid()`
- `tags` (text array) on jobs for freeform custom statuses — addresses the "limited customization" complaint
- All money fields use `numeric`, never float

### RLS model

- Helper functions: `current_company_id()`, `current_user_role()`, `is_admin_or_owner()` — all `security definer`, read from the calling user's `profiles` row
- Pattern: every table either has `company_id` directly, or is scoped via a join to a parent table that has it (e.g. `quote_line_items` scoped via `quote_id → quotes.company_id`)
- Staff (non-admin) can: read everything in their company, write their own timesheets, add job notes/photos. They cannot write invoices, price list, or company settings — adjust this if the actual permission model needs to differ
- Company creation is NOT done via direct insert — it should go through a signup server-side function. No insert policy exists for `companies` yet; build this when building auth/signup

## What's NOT built yet (everything else)

- Next.js project scaffold, routing, auth flow (signup creates `companies` row + first `owner` profile)
- Any UI at all
- Quote creation/editing screen (recommended first screen to build — it's the entry point to the whole workflow)
- Job scheduling/calendar view
- Timesheet entry (mobile-first — field staff will use this on phones)
- Invoice generation from a completed job (pulling timesheets + materials into line items)
- Stripe integration (both subscription billing and invoice payment)
- Customer-facing public quote/invoice view (token-based, no login)
- Email/SMS sending for quotes, invoices, reminders
- Xero/MYOB sync (deferred — do not start early)
- Reporting/dashboards (this is a named weakness in Tradify — worth investing in once core workflow works)

## Suggested build order

1. Next.js scaffold + Supabase project + run the two migrations
2. Auth + signup flow (company + owner profile creation)
3. Customers + customer sites CRUD
4. Price list CRUD
5. Quote builder (sections, line items, kits)
6. Customer-facing public quote view + accept/decline
7. Convert accepted quote → job
8. Job scheduling (visits) + basic calendar view
9. Timesheets (mobile-first)
10. Invoice generation (from job timesheets/materials, or manual) + progress invoicing
11. Stripe: invoice payment, then subscription billing
12. Reminders (quote follow-up, invoice overdue)
13. Reporting/dashboards
14. Xero/MYOB sync

## Open questions to resolve during build

- Exact staff permission boundaries (can staff create quotes? mark jobs complete?)
- Pricing/plan tiers for the SaaS itself (mirror Tradify's Lite/Pro/Plus, or differentiate with simpler transparent pricing as part of the "no pushy sales" positioning?)
- Whether to build native mobile (React Native) or PWA for field staff — Tradify's complaint about no offline access suggests offline-first matters here
- AU vs NZ GST/tax differences beyond the rate (companies.default_gst_rate handles the rate, but check invoice/quote document requirements for AU compliance)
