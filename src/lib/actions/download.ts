"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { getPresignedDownloadUrl, resolveObjectKeyFromFileUrl } from "@/lib/storage/r2";
import { logAuditEvent } from "@/lib/audit/logger";
import { checkRateLimit } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/id";

export type DownloadActionResult = { success: true; url: string } | { success: false; error: string };

// Each call mints a real R2-signed URL and writes an audit row — cheap
// individually, but nothing else here bounds how often an authorized caller
// (owner or SUPER_ADMIN) can invoke it. Same limit/window as upload.ts's
// upload-url limiter, the closest existing precedent for a per-user,
// per-signed-URL-mint cap.
const DOWNLOAD_URL_RATE_LIMIT = 20;
const DOWNLOAD_URL_RATE_WINDOW_MS = 60 * 1000;

// Manuscript file downloads are restricted to the original uploader
// (primary_author_id — the same field src/lib/actions/upload.ts already
// uses for ownership checks) or SUPER_ADMIN. Nobody else — not co-authors,
// not assigned editors/reviewers, not plain ADMIN — gets a signed URL.
//
// The authorization check runs entirely before any signed URL is
// generated: a denial never touches R2, and the caller never receives a
// usable URL to leak or retry with. getUserRole() reads the authoritative
// app_metadata role (src/lib/auth/rbac.ts), never client-controlled state.
export async function getManuscriptDownloadUrlAction(manuscriptId: string): Promise<DownloadActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "You must be signed in to download this file." };
  }
  if (!isValidUuid(manuscriptId)) {
    return { success: false, error: "File not found." };
  }

  const manuscript = await db.manuscript.findUnique({
    where: { id: manuscriptId },
    select: { file_url: true, primary_author_id: true },
  });
  if (!manuscript || !manuscript.file_url) {
    return { success: false, error: "File not found." };
  }

  const role = getUserRole(user);
  const isUploader = manuscript.primary_author_id === user.id;
  const isSuperAdmin = role === "SUPER_ADMIN";

  if (!isUploader && !isSuperAdmin) {
    await logAuditEvent({
      userId: user.id,
      action: "file.download_denied",
      resourceId: manuscriptId,
      metadata: { role },
    });
    return { success: false, error: "You are not authorized to download this file." };
  }

  const rateLimit = checkRateLimit(`download-url:${user.id}`, DOWNLOAD_URL_RATE_LIMIT, DOWNLOAD_URL_RATE_WINDOW_MS);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many download requests. Please wait a minute and try again." };
  }

  const objectKey = resolveObjectKeyFromFileUrl(manuscript.file_url);
  const url = await getPresignedDownloadUrl(objectKey);

  await logAuditEvent({
    userId: user.id,
    action: "file.download_url_issued",
    resourceId: manuscriptId,
    metadata: { asSuperAdmin: isSuperAdmin && !isUploader },
  });

  return { success: true, url };
}
