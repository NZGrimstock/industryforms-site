# PowerSync setup

Everything in the repo is ready. These are the remaining steps that have to be
done in the PowerSync + Supabase dashboards (they can't be done from code).

## What's already in the repo
- `supabase/migrations/022_powersync_company_id.sql` — denormalises `company_id`
  onto child tables (with backfill + triggers so app code is unchanged), sets
  `replica identity full`, and creates the `powersync` publication.
- `sync-rules.yaml` — per-company sync rules (parameter query on `profiles`).
- Connectors already wired: `tradiee-app/lib/powersync/connector.ts`,
  `tradiee-mobile/lib/powersync/connector.ts` (both send the Supabase access token).

## Steps

### 1. Apply the migration
Run migration `022` against your Supabase Postgres (e.g. `supabase db push`, or
paste it into the SQL editor). This creates the `powersync` publication PowerSync
requires.

### 2. Create a PowerSync instance
- Sign up at https://powersync.com and create a project + instance.
- **Connect to Postgres**: point it at your Supabase database using the *direct*
  connection (port 5432, not the pooler). PowerSync needs a role with replication
  rights. For Supabase Cloud, follow their "Supabase + PowerSync" connection guide.
  - ⚠️ This project currently runs Supabase locally (ports 54341–54347) with a
    demo JWT. PowerSync Cloud must be able to reach the database over the network —
    either move Supabase to Supabase Cloud / a public host, or self-host the
    PowerSync service alongside the local stack.

### 3. Configure authentication
PowerSync must validate the Supabase JWT the connectors send:
- **Supabase Cloud**: use the project's JWKS endpoint
  `https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json`, audience
  `authenticated`.
- **Self-hosted/local Supabase**: configure PowerSync with the HS256 shared secret
  (`SUPABASE_JWT_SECRET`), audience `authenticated`.

### 4. Upload sync rules
Paste `sync-rules.yaml` into Dashboard → Sync Rules and deploy. Use the
"Validate"/diagnostics tab to confirm the `company` bucket resolves.

### 5. Point the apps at the instance
Copy the instance URL (looks like `https://<id>.powersync.journeyapps.com`) into:
- `tradiee-mobile/.env` → `EXPO_PUBLIC_POWERSYNC_URL=...`
- `tradiee-app/.env` → add `NEXT_PUBLIC_POWERSYNC_URL=...` (not present yet)

Then restart: `npx expo start -c` (mobile) and the Next dev server (web).

### 6. Verify
- Mobile: open a job/quote/invoice/customer and the Schedule tab — data should
  appear (these screens read PowerSync's local DB via `useQuery`).
- PowerSync Dashboard → Instance logs should show the client connecting and the
  `company` bucket syncing rows.

## Notes
- **Web** only enables PowerSync in a secure context (HTTPS or localhost). Over the
  plain-HTTP Tailscale IP it stays disabled by design (`getPowerSyncDb()` returns
  null) and the web app reads Supabase directly. Run web over HTTPS/localhost to
  exercise offline sync there.
- The client schemas (`lib/powersync/schema.ts` in both apps) define which synced
  columns are queryable locally. If you sync a new table/column, add it there too.
