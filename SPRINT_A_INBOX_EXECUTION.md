# Sprint A — Unified Inbox · Claude Code Execution Doc

Last updated: 2026-07-03. Executes Sprint A of `SPRINTS_GROWTH_ENGINE_RESCOPED.md`.
Repo: `D:\TRADIEE`, web app `tradiee-app/`. Branch off `main`.

Session config: `opusplan` + auto permission. Run the **Reconnaissance gate** first,
then implement, then the **Reality Checker** gate must pass before merge.

---

## Objective (one sentence)

Give owner/admins one `/messages` page that shows every inbound communication —
SMS threads, website enquiries/leads, booking requests, and **unmatched inbound SMS
that currently has nowhere to land** — with triage actions and an SMS reply box that is
built now but stays cleanly disabled until Twilio is enabled.

## Ground truth (from PROJECT_STATE)

- Next.js 16, App Router, Turbopack. Uses `proxy.ts`, not `middleware.ts`.
- Supabase cloud, migrations 001–046 applied. **Next migration = 047.**
- RLS helpers (security definer): `current_company_id()`, `current_user_role()`, `is_admin_or_owner()`.
- `customer_messages` (mig 042): two-way SMS thread, owner/admin only, 15s polling on `/customers/[id]`.
- `communications` (mig 036), `enquiries` (email inbox + website `/api/site/lead`).
- `/api/sms/inbound` (Twilio inbound — **signature verification is a TODO/disabled**),
  `/api/sms/send` (outbound). Twilio is **intentionally dark** (no live creds).
- Supabase: `@/lib/supabase/browser` and `@/lib/supabase/server` — never a fresh client.
- Integrations settings tab already shows green-tick/amber per env var → a Twilio-status
  helper already exists somewhere; reuse it, don't reinvent.

---

## 0. RECONNAISSANCE GATE (do this before writing any code)

This doc was written from the handoff, not the live files. **Confirm each item against
the real repo and record the answer inline in your working notes. If reality differs
from an assumption below, follow reality, not this doc.**

1. **`customer_messages` actual columns.** Open the mig 042 file + the live table.
   Record the exact names for: tenant (`company_id`?), customer FK (`customer_id`?),
   direction (`direction` / `is_inbound` / other?), body, created_at, and any phone
   fields (`from_number` / `to_number`?). Everything below assumes
   `company_id`, `customer_id (nullable)`, a direction field, `body`, `created_at`.
2. **Does `/api/sms/inbound` persist UNMATCHED messages today?** Read the handler.
   If a no-customer-match inbound is dropped (not inserted), the Unmatched tab is empty
   by construction — you must add the insert (see §3). Also record **how it parses the
   body** (formData vs text) so signature verification doesn't double-consume the stream.
3. **Existing customer SMS thread** — file + component + query on `/customers/[id]`.
   This gets extracted into a shared component (§4) that BOTH pages import.
4. **Twilio-status helper** used by the Integrations tab. Find it; you'll pass its
   boolean into the messages client for the dark-aware reply box.
5. **Sidebar nav config** — where nav groups/items are defined, and whether icons are
   passed as components (`icon: MessageSquare`) or rendered elements (`icon: <MessageSquare/>`).
   PROJECT_STATE gotcha: passing icon *components* across the server→client boundary throws.
6. **RLS** on `customer_messages` and `enquiries` — confirm both already scope to
   company + owner/admin. If `enquiries` is broader, the `/messages` server query must
   still gate owner/admin.
7. **`enquiries` shape** — columns you'll normalize into the feed (name, email, phone,
   description/body, source, created_at, customer_id if any).
8. Confirm **047** is the next free migration number.

Do not proceed until 1–8 are answered.

---

## 1. Scope boundaries (anti-drift — do NOT do these)

- **Do not enable Twilio** or set any Twilio credentials.
- **Do not build** bookings tables, packages, availability, or the booking widget
  (Sprints C/D). The **Bookings tab is a placeholder** filtering `source='booking'`;
  it will be legitimately empty until Sprint D. That is expected, not a bug.
- **Do not touch** the mobile app (`tradiee-mobile/`) or PowerSync sync rules.
- **Core reply channel is SMS only** (dark-aware). Email-reply *sending* from the inbox
  is an explicit optional stretch (§8) — do not build it into core scope.
- Keep `/messages` **owner/admin only**. `assigned_to` column exists for later; no
  staff-assignment UI this sprint.
- No new dependencies unless the `twilio` package isn't already present (it is, given
  existing SMS routes) — reuse it for signature validation.

---

## 2. Migration — `supabase/migrations/047_inbox.sql`

Additive and **idempotent (re-runnable)**. Adjust column/constraint names only if recon
§1 shows different existing names.

```sql
-- 047_inbox.sql — Sprint A unified inbox
-- Additive columns + indexes on customer_messages. Safe to re-run.

alter table customer_messages
  add column if not exists read_at     timestamptz,
  add column if not exists assigned_to  uuid references profiles(id) on delete set null,
  add column if not exists status       text not null default 'open',
  add column if not exists source       text not null default 'sms';

-- status: open | pending | closed | spam
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customer_messages_status_chk') then
    alter table customer_messages
      add constraint customer_messages_status_chk
      check (status in ('open','pending','closed','spam'));
  end if;
end $$;

-- source: sms | email | booking | enquiry | web_lead
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'customer_messages_source_chk') then
    alter table customer_messages
      add constraint customer_messages_source_chk
      check (source in ('sms','email','booking','enquiry','web_lead'));
  end if;
end $$;

-- Inbox filter indexes
create index if not exists customer_messages_company_status_idx
  on customer_messages(company_id, status, created_at desc);
create index if not exists customer_messages_company_unread_idx
  on customer_messages(company_id, created_at desc) where read_at is null;
create index if not exists customer_messages_company_unmatched_idx
  on customer_messages(company_id, created_at desc) where customer_id is null;
```

**RLS**: new columns inherit `customer_messages`' existing policies — no new policy needed.
Confirm in recon §6 that those policies are owner/admin scoped. `read_at` is meaningful
for **inbound** rows only.

Apply with `supabase db push`. Then re-run once to prove idempotency (should be a no-op).

---

## 3. Persist unmatched inbound + verify Twilio signature

File: `tradiee-app/app/api/sms/inbound/route.ts`

### 3a. Signature verification (build now, enforced when Twilio is live)

Decision: **when `TWILIO_AUTH_TOKEN` is set, validate and reject invalid; when it is
unset (current dark state), return 503** so no spoofed rows can be written while dark.
(If you want local inbound testing while dark, gate that behind a temporary
`SMS_INBOUND_TEST_SECRET` header — note it and remove before go-live.)

Contract (integrate without double-consuming the request body — see recon §2):

```ts
import { validateRequest } from 'twilio';

const authToken = process.env.TWILIO_AUTH_TOKEN;
if (!authToken) return new Response('SMS not configured', { status: 503 });

// Twilio posts application/x-www-form-urlencoded. Parse ONCE, reuse for both
// validation and message handling.
const form = await req.formData();
const params = Object.fromEntries(form.entries());

// URL must EXACTLY match what Twilio calls (canonical app URL, not a rewritten
// subdomain — the proxy rewrites hosts, which is the usual cause of false failures).
const url = `${process.env.NEXT_PUBLIC_APP_URL}/api/sms/inbound`;
const signature = req.headers.get('x-twilio-signature') ?? '';
if (!validateRequest(authToken, signature, url, params)) {
  return new Response('Invalid signature', { status: 403 });
}
```

### 3b. Persist unmatched (feeds the Unmatched tab)

If recon §2 shows unmatched inbound is currently dropped, change the handler so that on
**no customer match** it still inserts a `customer_messages` row:
`customer_id = null`, `source = 'sms'`, `status = 'open'`, direction = inbound,
`body`, `company_id` resolved from the receiving Twilio number → company mapping the
route already uses for matched messages. Matched inbound keeps its current behaviour
plus `source='sms'`, `status='open'`.

---

## 4. Shared thread component

File: `tradiee-app/components/customers/sms-thread.tsx`

- Extract the existing `/customers/[id]` thread into this component: props
  `{ companyId, customerId?, conversationKey?, twilioLive }`.
- Renders ordered inbound/outbound bubbles + the reply box.
- **Reply box is dark-aware**: when `twilioLive === false`, render a disabled state
  ("SMS not enabled — configure Twilio in Settings → Integrations") instead of the input.
- Keep the existing 15s polling.
- **Refactor `/customers/[id]` to consume this component** so both pages render identical
  data from the same query. Verify the customer page still works after extraction.

---

## 5. Messages page (server) + client

Files:
- `tradiee-app/app/(dashboard)/messages/page.tsx` (server component)
- `tradiee-app/app/(dashboard)/messages/client.tsx` (interactivity)
- `tradiee-app/app/api/messages/conversations/route.ts` (list feed)
- `tradiee-app/app/api/messages/thread/route.ts` (selected thread)
- `tradiee-app/app/api/messages/[action]` or per-action routes for triage (§6)

### page.tsx (server)
- Gate owner/admin (redirect staff — mirror the paywall/role pattern in
  `app/(dashboard)/layout.tsx` / `lib/billing.ts`).
- Resolve `twilioLive` via the Integrations helper (recon §4) and pass to the client.
- Initial fetch of conversation summaries via `@/lib/supabase/server`.

### Unified feed shape (merge in the API route, not a DB view for v1)
Normalize the three sources into one `ConversationSummary`:

```ts
type ConversationSummary = {
  key: string;              // `sms:${customerId}` | `sms-unmatched:${msgId}` | `enquiry:${id}` | `booking:${id}`
  source: 'sms' | 'email' | 'booking' | 'enquiry' | 'web_lead';
  customerId: string | null;
  displayName: string;      // customer name, or sender phone/email for unmatched
  preview: string;          // last message/enquiry snippet
  lastActivity: string;     // ISO
  unread: boolean;          // any inbound with read_at null
  status: 'open' | 'pending' | 'closed' | 'spam';
};
```

- SMS: group `customer_messages` by `customer_id` (matched) or per-row (unmatched, null customer).
- Enquiries/web leads: one summary per enquiry row (`source` from enquiry).
- All queries run under the caller's session (RLS-scoped). Do not use the service client here.
- PROJECT_STATE gotcha: PostgREST to-one embeds infer as arrays under the typed client —
  cast `as unknown as {…} | null`.

### client.tsx
- Left: conversation list. Right: selected thread (renders `<SmsThread/>` for SMS
  conversations; a read-only detail panel for enquiry/booking sources this sprint).
- Top filters: channel, status, assignee, search.
- **Tabs → filters:**
  | Tab | Filter |
  |---|---|
  | Open | `status = 'open'` |
  | Unread | `unread = true` |
  | Bookings | `source = 'booking'` (empty until Sprint D — expected) |
  | Enquiries | `source in ('enquiry','web_lead')` |
  | Unmatched | `source = 'sms' AND customerId IS null` |
  | Closed | `status = 'closed'` |
- Poll `/api/messages/conversations` on the existing 15s cadence.

---

## 6. Triage actions

Per-action server routes (or one `/api/messages/action`), owner/admin, session-scoped:
- **Mark read**: set `read_at = now()` on inbound rows of the conversation.
- **Mark closed / spam**: set `status`.
- **Create customer** (from unmatched): prefill phone/email; on create, backfill
  `customer_messages.customer_id` for that sender so the thread re-homes to the customer.
- **Link to existing customer**: set `customer_id` on the unmatched rows.
- **Create quote / job**: link to existing `/new` routes with `?customerId=` (already plumbed).

All writes go through API routes with the session client; never the service client.

---

## 7. Navigation

- Add a **Messages** sidebar entry (recon §5) with a Lucide icon (`MessageSquare` or
  `Inbox`). Respect the icon-passing convention (element vs component) to avoid the
  server→client boundary throw. Mind Lucide name collisions.
- Place it in a sensible nav group with the existing pastel/active gradient styling.

---

## 8. Optional stretch (only if core is green) — email reply from inbox

Resend is live, so replying to email-sourced enquiries from the inbox is feasible:
send via the existing Resend path, log to `communications`, append to the thread.
**Do not start this until §§2–7 pass the Reality Checker.** Flag it as a separate commit.

---

## 9. Commit breakdown

1. `047_inbox.sql` + apply + idempotency re-run.
2. Inbound: signature verification + persist-unmatched.
3. Extract `sms-thread.tsx`; refactor `/customers/[id]` to use it.
4. `/messages` server page + conversations/thread API + client with tabs/filters.
5. Triage actions.
6. Sidebar entry.
7. (optional) email reply stretch.

Each commit ends with `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`.

---

## REALITY CHECKER — DoD gate (must all pass before merge to `main`)

Run these; a claim of "done" without green on every line is rejected.

### Build/type/lint
- [ ] `cd tradiee-app && npx tsc --noEmit` → clean.
- [ ] `npx eslint .` → no new errors (React-Compiler rules are warn; build fails on errors only).
- [ ] `npx next build` → succeeds.

### Migration
- [ ] `supabase db push` applies 047 cleanly.
- [ ] Re-running 047 is a no-op (proves idempotency).
- [ ] `customer_messages` now has `read_at, assigned_to, status, source` + the three indexes
  (`\d customer_messages`).

### Unmatched inbound (the core gap this sprint closes)
- [ ] Insert a test `customer_messages` row with `customer_id = null, source='sms',
  status='open'`, inbound. It appears in the **Unmatched** tab.
- [ ] "Create customer" from that row backfills `customer_id`; the row leaves Unmatched
  and re-homes under the new customer thread.

### Inbound security
- [ ] With `TWILIO_AUTH_TOKEN` unset: `POST /api/sms/inbound` → **503** (no row written).
- [ ] With a token set + a deliberately wrong `X-Twilio-Signature`: → **403** (no row written).
- [ ] Body is parsed once (no "body already consumed" runtime error).

### Twilio-dark UX
- [ ] Reply box renders the disabled "SMS not enabled" state everywhere `<SmsThread/>` is
  used (both `/messages` and `/customers/[id]`), because Twilio is dark.

### Single-source thread
- [ ] `/customers/[id]` and `/messages` render the **same thread** for the same customer
  (same component, same query) — verified by opening both.

### Access control
- [ ] A non-admin/staff session cannot load `/messages` (redirect or 403).
- [ ] All `/api/messages/*` routes use the **session** Supabase client (grep: no
  `createServiceClient` in these routes).

### Scope containment (anti-drift)
- [ ] No changes under `tradiee-mobile/` or to `sync-rules.yaml`.
- [ ] No bookings tables/packages/widget created (Sprint D only).
- [ ] No Twilio credentials committed or enabled.

### Sidebar
- [ ] **Messages** appears in the sidebar and routes to `/messages` without a
  server→client icon boundary error.

---

## Notes for the executing session

- If recon reveals `customer_messages` uses different column names, **rename in the SQL
  and code, don't force this doc's names.**
- If `/api/sms/inbound` already persists unmatched, skip §3b and just add §3a.
- Keep the enquiry/booking detail panels **read-only** this sprint; the rich thread UI is
  SMS-only. Booking replies belong to Sprint D.
- The Bookings tab being empty is a pass, not a fail.
