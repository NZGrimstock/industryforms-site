# Cloudflare R2 storage setup

Storage now uses **Cloudflare R2** (S3-compatible) instead of Supabase Storage.
- **Public bucket** (`tradiee-public`) — company logos & job photos, served from a
  custom domain. Stable public URLs (logos are embedded in PDFs/emails).
- **Private bucket** (`tradiee-private`) — compliance PDFs, served via short-lived
  presigned GET URLs.

Uploads from the browser/mobile use **presigned PUT URLs** minted by the web API
(`/api/storage/upload-url`) — R2 credentials never leave the server. The object key
is built server-side from the authenticated user's company, so a client can't write
outside its own space.

## Steps

### 1. Create the buckets
Cloudflare dashboard → R2 → Create bucket:
- `tradiee-public`
- `tradiee-private`

### 2. Public bucket → custom domain
- `tradiee-public` → Settings → **Custom Domains** → add e.g. `cdn.yourdomain.com`
  (Cloudflare creates the DNS record). Objects are then readable at
  `https://cdn.yourdomain.com/<key>`.
- Leave `tradiee-private` with **no** public access.

### 3. Public bucket → CORS (required for browser uploads)
`tradiee-public` → Settings → CORS policy:
```json
[
  {
    "AllowedOrigins": ["https://your-app-domain.com", "http://localhost:3000", "http://100.81.62.2:3000"],
    "AllowedMethods": ["PUT", "GET"],
    "AllowedHeaders": ["content-type"],
    "MaxAgeSeconds": 3600
  }
]
```
(Add each origin the web app is served from. Mobile uploads go through the web API,
not directly, so the phone's origin isn't needed here.)

### 4. API tokens (one per bucket — least privilege)
R2 → **Manage R2 API Tokens** → Create API token → Object Read & Write. Create **two**:
- one scoped to `industry-forms-public` → its keys go in the `R2_PUBLIC_*` vars
- one scoped to `industry-forms` → its keys go in the `R2_PRIVATE_*` vars

Copy each **Access Key ID** + **Secret Access Key**. Note your Cloudflare **Account ID**
(R2 overview page).

### 5. Environment variables
`tradiee-app/.env.local`:
```
R2_ACCOUNT_ID=<cloudflare account id>
R2_PUBLIC_BUCKET=industry-forms-public
R2_PRIVATE_BUCKET=industry-forms
R2_PUBLIC_ACCESS_KEY_ID=<public-bucket token access key id>
R2_PUBLIC_SECRET_ACCESS_KEY=<public-bucket token secret>
R2_PRIVATE_ACCESS_KEY_ID=<private-bucket token access key id>
R2_PRIVATE_SECRET_ACCESS_KEY=<private-bucket token secret>
NEXT_PUBLIC_R2_PUBLIC_BASE_URL=https://cdn.yourdomain.com
```
`tradiee-mobile/.env`:
```
EXPO_PUBLIC_R2_PUBLIC_BASE_URL=https://cdn.yourdomain.com
EXPO_PUBLIC_API_URL=<deployed web app URL, reachable from the phone>
```

### 6. Verify
- Web: Settings → upload a company logo → it appears, and the object lands in
  `tradiee-public` under `company-logos/<companyId>/`.
- Web: a job → add photos → they display from the custom domain.
- Web: generate a compliance doc → PDF lands in `tradiee-private`; the download link
  works (presigned, 24h).
- Mobile: open a job → add a photo (camera/gallery) → uploads and displays.

## Notes
- `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` power the server side
  (`tradiee-app/lib/r2.ts`). Mobile needs no SDK — it just `fetch`-PUTs to the
  presigned URL.
- **Obsolete**: Supabase Storage is no longer used. Migrations `005_storage_photos.sql`
  and `010_company_logos_bucket.sql` create Supabase buckets that are now unused
  (harmless — leave them, or skip on a fresh DB). The `compliance-docs` runtime
  `createBucket` call was removed.
- R2/S3 presigned GET URLs max out at **7 days**; compliance links are re-signed on
  demand (24h) by the document/job pages, so this is not a limitation in practice.
