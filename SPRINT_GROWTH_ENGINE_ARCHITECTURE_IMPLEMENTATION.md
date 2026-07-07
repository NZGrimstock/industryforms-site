# Sprint: Growth Engine, Messaging Inbox, and Online Bookings

Last updated: 2026-07-03

## Objective

Move IndustryForms beyond job-management parity and into the core market wedge:

> The job management platform that helps tradies get work, book work, retain customers, and grow revenue automatically.

This sprint focuses on the gap identified in `PROJECT_BRIEF.md` and `PROJECT_STATE.md`: competitors manage jobs reasonably well, but most do not combine job management, CRM, messaging, booking, deposits, review requests, and repeat-service automation in one simple product.
This sprint exploits the exact weaknesses of legacy competitors (Tradify, ServiceM8, Simpro). They manage jobs reasonably well, but they fail as true CRMs. Furthermore, they punish growth with per-user "scale taxes" and alienate workers with poor Android apps. IndustryForms will bridge the gap between job logistics and marketing automation, backed by flat-rate add-on pricing and day-one Android/iOS parity.

## Current Baseline

Already built or partly built:

- Customer-level two-way SMS thread.
- Twilio outbound/inbound SMS routes.
- Quote/invoice SMS routes.
- Reminder SMS plumbing.
- Enquiry inbox and website lead capture.
- Instant Website builder with a basic booking request section.
- Kits and price-list items.
- Stripe scaffolding for invoice payments, subscriptions, and terminal payments.
- Review request email after paid invoice.
- Customer portal token links.
- JSONB companies.addons structure for feature gating
- Expo (React Native) mobile app with PowerSync offline capabilities

Important gaps:

- No central Messages or Inbox page for SMS/email/booking replies.
- Inbound unmatched SMS has no useful owner-facing queue.
- Booking widget is request-only: no package selection, live availability, deposit, or automatic customer/job creation.
- Stripe production setup is still pending.
- Review requests are email-first, not a polished SMS/email growth workflow, missing an SMS Google Review engine
- Reporting does not yet prove lead source, booking conversion, automation revenue, or repeat-customer revenue.
- No automated "win-back" or recurring service SMS reminders
- Bookings and Website features lack proper Stripe - subscription gating

## Product Outcomes

By the end of this sprint, a trade business should be able to:

- See all customer communications in one inbox.
- Reply to customers by SMS from one place.
- Publish bookable packages on their website, gate-checked by a $14/mo or $19/mo subscription.
- Let website visitors choose a package, pick a real available time, and pay a Stripe deposit to deter tire-kickers.
- Automatically match bookings to existing customers by email or phone.
- Automatically create new customers when no match exists.
- Turn a booking into a job, scheduled visit, and optionally an invoice/deposit payment record.
- Trigger confirmation and reminder messages.
- Automatically text customers a Google Review link after a paid invoice
- Prove exactly which channels and automations are producing revenue via reporting

## Architecture Overview

### 1. Unified Communications Inbox

Add a first-class dashboard route:

- `/messages`

Purpose:

- Central owner/admin inbox for inbound SMS, customer SMS threads, booking requests, website enquiries, quote replies, invoice/payment notifications, and unmatched inbound messages.

Existing data to reuse:

- `customer_messages`
- `communications`
- `enquiries`
- `customers`
- `quotes`
- `invoices`
- `company_id` tenancy model

Recommended additions:

```sql
alter table customer_messages
  add column if not exists read_at timestamptz,
  add column if not exists assigned_to uuid references profiles(id) on delete set null,
  add column if not exists status text not null default 'open',
  add column if not exists source text not null default 'sms';
```

Status values:

- `open`
- `pending`
- `closed`
- `spam`

Inbox tabs:

- Open
- Unread
- Bookings
- Enquiries
- Unmatched
- Closed

Core UI:

- Left column: conversation list.
- Right column: selected conversation thread.
- Top filters: channel, status, assignee, search.
- Reply box for SMS.
- Quick actions: create customer, create quote, create job, schedule visit, mark closed.

Security:

- Owner/admin only for now.
- Staff access can be added later by assignment.

### 2. Bookable Packages

Add internal admin route:

- `/bookings/packages`

Purpose:

- Define public packages customers can book from a user's website. These are distinct from internal kits because they include duration, deposit, and availability rules.

Package examples:

- WOF inspection
- Oil change
- Heat pump install
- Heat pump service
- Electrical safety check
- Plumbing callout
- Standard maintenance visit

Recommended table:

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
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookable_packages_company_idx
  on bookable_packages(company_id, is_active, sort_order);
```

Notes:

- A package may link to a kit or a price-list item, but it should not be only a kit.
- Kits are internal bundles. Bookable packages are customer-facing offers with time, deposit, and availability rules.

### 3. Booking Availability

Add settings route or section:

- `/settings` -> Workflow -> Online booking

Company-level settings:

```sql
create table if not exists booking_settings (
  company_id uuid primary key references companies(id) on delete cascade,
  timezone text not null default 'Pacific/Auckland',
  min_notice_hours integer not null default 12,
  max_days_ahead integer not null default 45,
  slot_interval_minutes integer not null default 30,
  default_buffer_minutes integer not null default 15,
  require_manual_approval boolean not null default true,
  confirmation_channel text not null default 'sms_email',
  reminder_hours_before integer not null default 24,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Availability source:

- Company booking settings.
- Working hours.
- Existing `job_visits`.
- Selected package duration and buffers.
- Optional assigned staff.
- Optional Google Calendar conflicts once two-way sync is added.

Recommended working-hours table:

```sql
create table if not exists booking_availability_rules (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  day_of_week integer not null check (day_of_week between 0 and 6),
  starts_at time not null,
  ends_at time not null,
  is_active boolean not null default true
);
```

Recommended blackout table:

```sql
create table if not exists booking_blackouts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  reason text
);
```

### 4. Booking Records

Recommended table:

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
  customer_name text not null,
  customer_email text,
  customer_phone text,
  site_address text,
  notes text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  deposit_required numeric(12,2) not null default 0,
  deposit_paid numeric(12,2) not null default 0,
  stripe_payment_intent_id text,
  public_token uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists bookings_company_status_idx
  on bookings(company_id, status, starts_at);

create unique index if not exists bookings_public_token_idx
  on bookings(public_token);
```

Status values:

- `requested`
- `deposit_pending`
- `confirmed`
- `scheduled`
- `completed`
- `cancelled`
- `no_show`

### 5. Website Booking Widget

Upgrade the existing website booking section from "request a booking" to a real booking widget.

Public route options:

- Embedded in `/site/[slug]`
- Dedicated package route: `/site/[slug]/book/[packageSlug]`
- Optional embeddable script later for external non-IndustryForms websites.

Widget steps:

1. Select package.
2. Pick date/time from available slots.
3. Enter name, email, phone, and site address.
4. Confirm price and deposit.
5. Pay deposit via Stripe when required.
6. Show confirmation screen.

Customer matching:

- Match by normalized email first.
- Match by normalized phone second.
- If both match different customers, create an admin review flag.
- If no match, create a new customer and customer site.

Booking creation rules:

- If package `auto_confirm = true` and deposit is not required, create booking + job + visit immediately.
- If package requires deposit, create booking as `deposit_pending`, then confirm from Stripe webhook.
- If manual approval is enabled, create booking as `requested` and show it in Messages/Bookings inbox.

### 6. Stripe Deposit Flow

New API routes:

- `POST /api/bookings/availability`
- `POST /api/bookings/create`
- `POST /api/bookings/deposit-intent`
- `POST /api/bookings/confirm`

Stripe webhook update:

- On `payment_intent.succeeded`, find booking by `stripe_payment_intent_id`.
- Set `deposit_paid`.
- Set status to `confirmed` or `scheduled`.
- Create job/visit if not already created.
- Insert payment record if an invoice was created.
- Send confirmation SMS/email.

Deposit calculation:

- If `deposit_amount` is set, use it.
- Else if `deposit_percent` is set, calculate from package price.
- Else no deposit.

### 7. Automation Layer

This is where the product becomes a growth engine rather than just a booking form.

Booking automations:

- Booking requested confirmation.
- Deposit received confirmation.
- Manual approval confirmation.
- 24-hour appointment reminder.
- "Thanks, here is your invoice" after completion.
- Review request after paid/completed.
- Repeat service reminder after configured interval.

Recommended table:

```sql
create table if not exists automation_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  booking_id uuid references bookings(id) on delete cascade,
  event_type text not null,
  channel text not null,
  scheduled_for timestamptz,
  sent_at timestamptz,
  status text not null default 'pending',
  error text,
  created_at timestamptz not null default now()
);
```

Cron can reuse the existing reminders pattern.

### 8. Billing & Subscription Gating
Utilize the existing companies.addons JSONB structure and lib/billing.ts.

Stripe Pricing Strategy:

Online Bookings Add-on: $14.00/mo

Instant Website Add-on: $14.00/mo

Digital Growth Bundle (Both): $19.00/mo

Implementation:

Update /api/bookings/create and /api/bookings/availability to enforce hasAddon('bookings') or hasAddon('digital_growth_bundle')

Wrap the /bookings/packages admin UI in a paywall prompting the Stripe checkout

Update the Stripe webhook to flip the respective companies.addons JSONB keys to true upon customer.subscription.created

### 9. Automation & Growth Engine (SMS)
This is where the product beats competitors by actively hunting for revenue.

SMS Google Review Engine:

Update existing post-payment flow to send an SMS instead of (or alongside) an email. SMS has a 90%+ open rate, driving massive local SEO value for the tradie.

Win-Back / Recurring Service Reminders:

Add fields to bookable_packages for recurring intervals (e.g., 11 months).

Existing cron (/api/reminders) evaluates completed jobs and triggers an automated SMS: "Hi [Name], it's time for your annual [Service]! Tap here to book: [Booking Link]"

### 10. Reporting

Add dashboard/report cards that prove the wedge:

- Leads by source.
- Bookings by package.
- Booking conversion rate.
- Deposit revenue.
- Quote acceptance rate.
- Revenue from automated follow-ups.
- Review requests sent and clicked.
- Repeat customer revenue.
- Average response time to inbound SMS/enquiries.

This should become a marketing asset: the app can show the user exactly how much work the system helped capture.

## Implementation Plan

### Phase 0: Paywall & Stripe Configuration
Create the $14 Bookings, $14 Website, and $19 Bundle products in Stripe.

Update lib/billing.ts to support the new JSONB keys.

Build the upgrade prompt UI for the admin dashboard.

### Phase 1: Inbox and SMS Productization

Files/areas:

- `tradiee-app/app/(dashboard)/messages/page.tsx`
- `tradiee-app/app/(dashboard)/messages/client.tsx`
- `tradiee-app/components/customers/sms-thread.tsx`
- `tradiee-app/app/api/sms/send/route.ts`
- `tradiee-app/app/api/sms/inbound/route.ts`
- `supabase/migrations/*_growth_engine_inbox.sql`

Tasks:

- Add columns to `customer_messages`: `read_at`, `assigned_to`, `status`, `source`.
- Build central Messages page.
- Show inbound/outbound thread for selected customer.
- Add unread/open/closed filters.
- Add unmatched inbound queue.
- Add actions: create customer, link to customer, mark closed.
- Add Twilio signature verification before production.

Acceptance criteria:

- Owner/admin can see all inbound SMS in one place.
- Customer detail thread and Messages page show the same thread.
- Inbound unmatched messages are visible and actionable.
- Replies from Messages page create outbound SMS rows.

### Phase 2: Bookable Packages Admin

Files/areas:

- `tradiee-app/app/(dashboard)/bookings/packages/page.tsx`
- `tradiee-app/app/(dashboard)/bookings/packages/client.tsx`
- `tradiee-app/app/(dashboard)/settings/client.tsx`
- `supabase/migrations/*_bookable_packages.sql`

Tasks:

- Create `bookable_packages`.
- Add package list and editor.
- Allow linking to kit or price-list item.
- Set duration, price, deposit, buffers, active flag, auto-confirm.
- Add package preview text for website.

Acceptance criteria:

- Admin can create a public package from scratch.
- Admin can create a public package from a kit.
- Active packages are available to the website booking widget.

### Phase 3: Availability Engine

Files/areas:

- `tradiee-app/app/api/bookings/availability/route.ts`
- `tradiee-app/lib/bookings/availability.ts`
- `supabase/migrations/*_booking_availability.sql`

Tasks:

- Create `booking_settings`, `booking_availability_rules`, and `booking_blackouts`.
- Implement slot generation.
- Exclude existing job visits.
- Apply package duration and buffers.
- Respect minimum notice and max days ahead.

Acceptance criteria:

- Public widget only shows valid available slots.
- Slots disappear when a job visit already occupies the time.
- Admin can set basic business hours.

### Phase 4: Website Booking Widget

Files/areas:

- `tradiee-app/app/site/[slug]/booking-form.tsx`
- `tradiee-app/app/site/[slug]/sections.tsx`
- `tradiee-app/app/api/bookings/create/route.ts`
- `tradiee-app/app/api/site/lead/route.ts`

Tasks:

- Replace booking request form with multi-step widget.
- Select package.
- Select available slot.
- Capture customer details.
- Match/create customer.
- Create booking record.
- Create enquiry for manual approval mode.
- Create job and visit for auto-confirm mode.

Acceptance criteria:

- Visitor can complete a booking request without logging in.
- Existing customer is matched by email/phone.
- New customer and customer site are created when needed.
- Admin sees the booking in dashboard/messages.

### Phase 5: Deposits and Stripe

Files/areas:

- `tradiee-app/app/api/bookings/deposit-intent/route.ts`
- `tradiee-app/app/api/stripe/webhook/route.ts`
- `tradiee-app/lib/stripe.ts`

Tasks:

- Create PaymentIntent for deposit.
- Save `stripe_payment_intent_id` to booking.
- Confirm booking after webhook succeeds.
- Create payment row when invoice exists.
- Add failure/cancel handling.

Acceptance criteria:

- Visitor can pay deposit.
- Booking is not confirmed until payment succeeds when deposit is required.
- Stripe webhook updates booking state idempotently.

### Phase 6: Booking Automations

Files/areas:

- `tradiee-app/app/api/reminders/route.ts`
- `tradiee-app/lib/email.ts`
- `tradiee-app/lib/sms.ts`
- `tradiee-app/lib/review-request.ts`
- `supabase/migrations/*_automation_events.sql`

Tasks:

- Add confirmation email/SMS.
- Add appointment reminder.
- Add no-reply and failure logging.
- Add review request by SMS after paid/completed where phone exists.
- Add repeat-service reminder fields on bookable packages.

Acceptance criteria:

- Booking confirmation sends automatically.
- Reminder sends before appointment.
- Automation events are logged.
- Failed sends are visible to admin.

### Phase 7: Growth Reporting

Files/areas:

- `tradiee-app/app/(dashboard)/reports/page.tsx`
- `tradiee-app/app/(dashboard)/dashboard/page.tsx`
- `tradiee-app/lib/reports/*`

Tasks:

- Add booking conversion cards.
- Add lead source report.
- Add booking revenue report.
- Add automation revenue attribution.
- Add review request metrics.

Acceptance criteria:

- Owner can see how many jobs came from website bookings.
- Owner can see booked/deposit revenue by package.
- Owner can see response-time and follow-up performance.

### Phase 8. Growth Automations (The "Sleep" Engine)
Update review requests to prioritize SMS routing.

Implement recurring service cron logic to send "win-back" booking links.

## Navigation Changes

Add sidebar entries:

- Messages
- Bookings

Suggested structure:

- Messages: all communication and replies.
- Bookings: calendar/list of bookings, package management, booking settings.

Mobile:

- Later phase. For MVP, web owner/admin first.
- Mobile staff should eventually see bookings as scheduled visits once converted.

## RLS and Security

Every new table must:

- Include `company_id`.
- Enable RLS.
- Scope reads/writes to `current_company_id()`.
- Limit package/settings writes to owner/admin.
- Allow public booking only through server routes using the service client.

Public booking routes must:

- Never expose service keys.
- Validate package belongs to published website company.
- Rate-limit or basic spam-protect lead/booking creation.
- Validate Stripe webhook signatures.
- Validate Twilio inbound signatures before production.

## Dependencies

Required before full production:

- Stripe production keys and webhook.
- Resend production sender.
- Twilio signature verification.
- Website wildcard/custom-domain setup for public booking pages.

Optional but valuable:

- Google Calendar conflict import.
- Per-company Twilio numbers.
- Google Business Profile integration.

## Risks and Decisions

### Booking as enquiry vs booking as job

Decision:

- Manual approval mode creates booking + enquiry.
- Auto-confirm mode creates booking + job + visit.

Reason:

- Some trades need to qualify work before committing.
- Simple packages like WOF/oil change/service call can be instant-booked.

### Package vs kit

Decision:

- Add `bookable_packages`.
- Link optionally to kits/items.

Reason:

- Kits do not know duration, deposit, buffers, public copy, or booking rules.

### Matching by email/phone

Decision:

- Match email first, then normalized phone.
- If conflicting matches appear, create booking and flag for review.

Reason:

- Avoid attaching paid bookings to the wrong customer.

### Central inbox scope

Decision:

- Owner/admin only for MVP.

Reason:

- Current communications are financial-adjacent and customer-sensitive.
- Staff participation can be added via `assigned_to` later.

## Definition of Done

This sprint is done when:

- Messages page exists and is useful for SMS/enquiry handling.
- Bookable packages can be configured.
- Website visitors can select a package, choose a time, and submit a booking.
- Deposit payments work in Stripe where required.
- Booking creates or links customers correctly.
- Booking creates the correct internal record: enquiry, job, visit, invoice/payment as configured.
- Confirmation/reminder messages are sent and logged.
- Owner can report on bookings and lead source performance.

## Suggested Commit Breakdown

1. Add messaging inbox schema and UI.
2. Add bookable package schema and admin UI.
3. Add availability settings and slot generation.
4. Upgrade public website booking widget.
5. Add Stripe deposit flow and webhook handling.
6. Add booking confirmations/reminders.
7. Add growth reporting cards.

## Marketing Angle Enabled

After this sprint, the go-to-market strategy is clear. The app can credibly claim:

- The "No Scale Tax" Promise: Unlike Tradify, we charge a flat rate for our core features and transparent add-ons. Grow your crew without multiplying your software bill.
= Flawless Android & iOS: Built in modern React Native, half the workforce isn't treated as a second-class citizen (ServiceM8's primary weakness).
- The Growth Engine: We don't just organize your current jobs. We take deposits to block tire-kickers, automatically hustle for Google Reviews via text, and automatically re-book your past customers while you sleep.
- Website visitors can book and pay deposits without phone tag.
- Every lead and customer reply lands in one inbox.
- Follow-ups, reminders, and review requests happen automatically.
- Owners can see which work came from website bookings and automations.

This directly attacks the competitor weakness: job management tools manage the work, but they do not actively help the trade business win, book, and retain the work.
