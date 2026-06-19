import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Cloudflare R2 is S3-compatible. Credentials are server-only — never expose them
// to the client. Uploads from the browser/mobile go through presigned URLs.
// Each bucket has its own scoped API token (least privilege).
const accountId = process.env.R2_ACCOUNT_ID!
const endpoint = `https://${accountId}.r2.cloudflarestorage.com`

export const PUBLIC_BUCKET = process.env.R2_PUBLIC_BUCKET!
export const PRIVATE_BUCKET = process.env.R2_PRIVATE_BUCKET!

// Public assets (logos, job photos) are served from a custom domain mapped to the
// public bucket. Exposed to the client as NEXT_PUBLIC_R2_PUBLIC_BASE_URL too.
export const PUBLIC_BASE_URL = (process.env.NEXT_PUBLIC_R2_PUBLIC_BASE_URL ?? '').replace(/\/$/, '')

function makeClient(accessKeyId: string, secretAccessKey: string): S3Client {
  return new S3Client({ region: 'auto', endpoint, credentials: { accessKeyId, secretAccessKey } })
}

let _public: S3Client | null = null
let _private: S3Client | null = null

function r2Public(): S3Client {
  if (!_public) _public = makeClient(process.env.R2_PUBLIC_ACCESS_KEY_ID!, process.env.R2_PUBLIC_SECRET_ACCESS_KEY!)
  return _public
}
function r2Private(): S3Client {
  if (!_private) _private = makeClient(process.env.R2_PRIVATE_ACCESS_KEY_ID!, process.env.R2_PRIVATE_SECRET_ACCESS_KEY!)
  return _private
}
function clientForBucket(bucket: string): S3Client {
  return bucket === PUBLIC_BUCKET ? r2Public() : r2Private()
}

/** Full public URL for an object key in the public bucket. */
export function publicUrl(key: string): string {
  return `${PUBLIC_BASE_URL}/${key}`
}

/** Presigned PUT URL so a client can upload directly to the public bucket. */
export function presignedUpload(key: string, contentType: string, expiresIn = 300): Promise<string> {
  return getSignedUrl(r2Public(), new PutObjectCommand({ Bucket: PUBLIC_BUCKET, Key: key, ContentType: contentType }), { expiresIn })
}

/** Presigned GET URL for a private object (e.g. compliance PDFs). */
export function presignedDownload(key: string, expiresIn = 60 * 60 * 24): Promise<string> {
  return getSignedUrl(r2Private(), new GetObjectCommand({ Bucket: PRIVATE_BUCKET, Key: key }), { expiresIn })
}

/** Upload bytes straight to a bucket from the server (used for generated PDFs). */
export async function putObject(bucket: string, key: string, body: Uint8Array | Buffer, contentType: string): Promise<void> {
  await clientForBucket(bucket).send(new PutObjectCommand({ Bucket: bucket, Key: key, Body: body, ContentType: contentType }))
}

/** Delete an object from the public bucket. */
export async function deletePublicObject(key: string): Promise<void> {
  await r2Public().send(new DeleteObjectCommand({ Bucket: PUBLIC_BUCKET, Key: key }))
}
