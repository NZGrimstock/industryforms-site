# Move Supabase: local → Supabase Cloud

The codebase is already cloud-ready — `supabase db push` applies all 22 migrations
(including the `powersync` publication and the storage buckets). The remaining work
is creating the cloud project and swapping credentials, which must be done by you.

## 0. Before you start
- The current local project uses **demo** JWT keys (`iss: supabase-demo`) and is at
  **Postgres 17** (`supabase/config.toml` → `major_version = 17`). Create the cloud
  project on **Postgres 17** so it matches (or change `major_version` to match).
- ⚠️ `tradiee-app/.env.local` contains a real Google OAuth client secret. It's only
  on your machine (not a git repo), but treat it as sensitive — rotate it if it ever
  leaks, and keep `.env*` out of version control.

## 1. Create the cloud project
1. https://supabase.com/dashboard → New project (Postgres 17). Pick a region close to NZ/AU (e.g. Sydney).
2. From **Project Settings → API Keys**, copy: Project URL, the **publishable** key
   (`sb_publishable_…`, client-safe), and the **secret** key (`sb_secret_…`, server-only).
3. From **Project Settings → Database**: copy the **direct** connection string (port 5432)
   and the **pooler** connection string (port 6543). Note the DB password.
4. From **Project Settings → API → JWT Settings**: note the JWT secret (for PowerSync auth).

## 2. Push the schema
```bash
cd D:/TRADIEE
supabase link --project-ref <your-project-ref>
supabase db push          # applies migrations 001–022 to the cloud DB
```
This creates all tables, RLS, and the `powersync` publication.

> **Storage is now Cloudflare R2, not Supabase Storage** — see `R2_SETUP.md`. The old
> Supabase bucket migrations (`005`, `010`) are obsolete but harmless.

## 3. Migrate data (only if you need the local data)
If the local DB is just test data, skip this — re-register your account on cloud.
To carry data over:
```bash
# Auth users first (so profiles/companies FKs resolve)
supabase db dump --local --schema auth --data-only -f auth_data.sql
# Then app data
supabase db dump --local --data-only -f data.sql
# Apply both to cloud (psql with the direct connection string)
psql "<cloud-direct-connection-string>" -f auth_data.sql
psql "<cloud-direct-connection-string>" -f data.sql
```

## 4. Update environment variables

### `tradiee-app/.env.local`
```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key (sb_publishable_...)>
SUPABASE_SECRET_KEY=<secret key (sb_secret_...)>
# SUPABASE_URL / SUPABASE_DB_URL are no longer read by app code — remove them,
# or keep SUPABASE_DB_URL=<cloud direct connection> for CLI/tooling only.
NEXT_PUBLIC_APP_URL=<your deployed/dev app URL>
NEXT_PUBLIC_POWERSYNC_URL=<from PowerSync, see POWERSYNC_SETUP.md>
# Stripe / Resend / Xero / Google / Anthropic — unchanged
```

### `tradiee-mobile/.env`
```
EXPO_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<publishable key (sb_publishable_...)>
EXPO_PUBLIC_POWERSYNC_URL=<from PowerSync>
EXPO_PUBLIC_API_URL=<your app URL>
```

## 5. Configure Auth (Supabase Dashboard → Authentication → URL Configuration)
- **Site URL**: your app URL.
- **Redirect URLs**: add the app URL and `<app-url>/auth/callback`.
- If using Google sign-in: enable the Google provider with your client ID/secret, and
  add the Supabase callback (`https://<ref>.supabase.co/auth/v1/callback`) to the
  **Google Cloud Console** authorised redirect URIs.

## 6. Re-point PowerSync at the cloud DB
This also resolves the earlier blocker (PowerSync couldn't reach a local DB):
- In PowerSync, connect to the cloud Postgres using the **direct** connection (port 5432).
- Configure PowerSync auth with the cloud project's **JWKS**:
  `https://<ref>.supabase.co/auth/v1/.well-known/jwks.json`, audience `authenticated`.
- See `POWERSYNC_SETUP.md` for the rest (sync rules upload, env URL).

## 7. Verify
- Web: `npm run dev`, sign up/in, create a customer/job — confirm it persists in the
  cloud DB (Dashboard → Table editor).
- Mobile: `npx expo start -c`, sign in, lists load.
- Storage: handled by Cloudflare R2 (`R2_SETUP.md`) — upload a job photo and confirm
  it lands in the `tradiee-public` R2 bucket.
- PowerSync: Dashboard shows the client connected and the `company` bucket syncing.

## Notes
- `next.config.ts` `allowedDevOrigins: ['100.81.62.2']` is only for accessing the local
  dev server over your Tailscale IP — harmless to keep, irrelevant to cloud.
- Once on cloud you no longer need `supabase start` / the local stack for day-to-day dev,
  though you can still run it for isolated testing.
