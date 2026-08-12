import "server-only";
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Cloudflare R2 is S3-compatible: same SDK, just a custom account-scoped
// endpoint and region "auto" instead of an AWS region.
const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  },
});

const UPLOAD_URL_TTL_SECONDS = 900; // 15 minutes — presigned PUT URLs expire to avoid orphaned/stale grants

// R2/S3 keys are opaque flat strings, not filesystem paths — "../" in a key
// doesn't let anything escape the bucket the way it would on a real
// filesystem. Still, fileName is client-supplied and only length-checked
// by uploadRequestSchema, so a crafted name like "x/../../evil" would
// otherwise splice arbitrary characters (including slashes) into the
// extension segment below. Constraining it to a short alnum extension
// keeps the generated key matching OBJECT_KEY_PATTERN's own expectations
// (parseObjectKey already requires this shape) rather than relying on that
// later check alone to catch a malformed key.
const SAFE_EXTENSION = /^[a-z0-9]{1,10}$/i;

export function buildObjectKey({
  fileName,
  fileHash,
  isSITConference,
}: {
  fileName: string;
  fileHash: string;
  isSITConference: boolean;
}): string {
  const rawExtension = fileName.includes(".") ? fileName.split(".").pop() : undefined;
  const extension = rawExtension && SAFE_EXTENSION.test(rawExtension) ? rawExtension.toLowerCase() : "bin";
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  const track = isSITConference ? "sit-conf" : "general";
  return `uploads/${track}/${year}/${timestamp}_${fileHash}.${extension}`;
}

// ContentLength is bound into the presigned URL's signature — R2 (like S3)
// rejects a PUT whose actual Content-Length header doesn't match what was
// signed, so a client can't request a URL for a small, size-cap-passing
// file and then upload something larger through the same URL. The
// server-declared fileSize (already validated against the 25MB cap in
// uploadRequestSchema) is what gets signed here, not a value the client
// controls independently at upload time — and browsers compute Content-
// Length from the real request body themselves, so this can't be spoofed
// from the legitimate upload path either.
export async function getPresignedUploadUrl(objectKey: string, contentType: string, contentLength: number): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
    ContentLength: contentLength,
  });
  return getSignedUrl(r2Client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

const DOWNLOAD_URL_TTL_SECONDS = 300; // 5 minutes — issued on-demand per authorized request, not held onto

// Callers MUST authorize the request before calling this — it does no
// authorization itself, it only mints a signed URL for whatever key it's
// given. See src/lib/actions/download.ts for the authorization check that
// must run first.
export async function getPresignedDownloadUrl(objectKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: objectKey,
  });
  return getSignedUrl(r2Client, command, { expiresIn: DOWNLOAD_URL_TTL_SECONDS });
}

// manuscript.file_url may be a bare object key (current default — no public
// bucket domain configured, see buildStoredFileUrl above) or a full public
// URL (if R2_PUBLIC_BASE_URL were ever set). Recover the object key either
// way — buildObjectKey always starts a key with "uploads/", so that prefix
// is a reliable anchor regardless of which public base URL was in effect
// when the row was written.
export function resolveObjectKeyFromFileUrl(fileUrl: string): string {
  const idx = fileUrl.indexOf("uploads/");
  return idx === -1 ? fileUrl : fileUrl.slice(idx);
}

// R2 buckets are private by default. Only resolves to a fetchable URL when a
// public custom domain / r2.dev bucket URL has been configured; otherwise the
// object key itself is stored so a signed GET URL can be issued on demand later.
export function buildStoredFileUrl(objectKey: string): string {
  const publicBase = process.env.R2_PUBLIC_BASE_URL;
  return publicBase ? `${publicBase.replace(/\/$/, "")}/${objectKey}` : objectKey;
}

const OBJECT_KEY_PATTERN = /^uploads\/(sit-conf|general)\/\d{4}\/\d+_([0-9a-f]{64})\.[a-z0-9]+$/;

// Ties an objectKey back to the hash buildObjectKey encoded into it, so the
// confirm step (confirmUploadAction) can reject an objectKey/fileHash pair
// that wasn't actually the one requestUploadUrlAction issued — otherwise a
// caller could request a presigned URL for one file's hash (passing the
// duplicate-content check) and then confirm with a different, unrelated
// fileHash, decoupling the recorded file_hash from the object it names.
// Doesn't confirm the object was actually PUT to R2 (no credentials to test
// a HeadObject call against in this environment) — only that the key and
// hash are internally consistent with what was issued.
export function parseObjectKey(objectKey: string): { track: "sit-conf" | "general"; fileHash: string } | null {
  const match = OBJECT_KEY_PATTERN.exec(objectKey);
  if (!match) return null;
  return { track: match[1] as "sit-conf" | "general", fileHash: match[2] };
}
