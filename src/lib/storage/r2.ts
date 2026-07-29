import "server-only";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
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

export function buildObjectKey({
  fileName,
  fileHash,
  isSITConference,
}: {
  fileName: string;
  fileHash: string;
  isSITConference: boolean;
}): string {
  const extension = fileName.includes(".") ? fileName.split(".").pop() : "bin";
  const year = new Date().getFullYear();
  const timestamp = Date.now();
  const track = isSITConference ? "sit-conf" : "general";
  return `uploads/${track}/${year}/${timestamp}_${fileHash}.${extension}`;
}

export async function getPresignedUploadUrl(objectKey: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: objectKey,
    ContentType: contentType,
  });
  return getSignedUrl(r2Client, command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
}

// R2 buckets are private by default. Only resolves to a fetchable URL when a
// public custom domain / r2.dev bucket URL has been configured; otherwise the
// object key itself is stored so a signed GET URL can be issued on demand later.
export function buildStoredFileUrl(objectKey: string): string {
  const publicBase = process.env.R2_PUBLIC_BASE_URL;
  return publicBase ? `${publicBase.replace(/\/$/, "")}/${objectKey}` : objectKey;
}
