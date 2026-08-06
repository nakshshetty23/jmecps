"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { buildObjectKey, buildStoredFileUrl, getPresignedUploadUrl } from "@/lib/storage/r2";
import { uploadRequestSchema, uploadConfirmSchema } from "@/lib/validations/upload";
import { logAuditEvent } from "@/lib/audit/logger";
import { checkRateLimit } from "@/lib/rate-limit";

const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];
const UPLOAD_URL_RATE_LIMIT = 10;
const UPLOAD_URL_RATE_WINDOW_MS = 60 * 1000;

export type UploadActionResult<T = unknown> = {
  success: boolean;
  error?: string;
  duplicate?: boolean;
  data?: T;
};

async function getOwnedDraftManuscript(manuscriptId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "You must be signed in as a researcher to upload a file." } as const;

  const role = getUserRole(user);
  if (role !== "RESEARCHER" && role !== "SUPER_ADMIN") {
    return { error: "You must be signed in as a researcher to upload a file." } as const;
  }

  const manuscript = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!manuscript || manuscript.primary_author_id !== user.id) {
    return { error: "Manuscript not found." } as const;
  }
  if (manuscript.status !== "DRAFT") {
    return { error: "This manuscript has already been submitted and its file can no longer be changed." } as const;
  }

  return { manuscript, userId: user.id } as const;
}

function getFileExtension(fileName: string): string {
  return fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
}

export async function requestUploadUrlAction(input: unknown): Promise<UploadActionResult<{ uploadUrl: string; objectKey: string }>> {
  const parsed = uploadRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid upload request." };
  }
  const { manuscriptId, fileName, fileType, fileHash, isSITConference, overrideDuplicate } = parsed.data;

  const owned = await getOwnedDraftManuscript(manuscriptId);
  if ("error" in owned) return { success: false, error: owned.error };

  const rateLimit = checkRateLimit(`upload-url:${owned.userId}`, UPLOAD_URL_RATE_LIMIT, UPLOAD_URL_RATE_WINDOW_MS);
  if (!rateLimit.allowed) {
    return { success: false, error: "Too many upload requests. Please wait a minute and try again." };
  }

  const extension = getFileExtension(fileName);
  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return { success: false, error: "Only PDF and Word documents (.pdf, .doc, .docx) are allowed." };
  }

  if (!overrideDuplicate) {
    const duplicate = await db.manuscript.findFirst({
      where: {
        file_hash: fileHash,
        status: { not: "REJECTED" },
        NOT: { id: manuscriptId },
      },
    });
    if (duplicate) {
      return {
        success: false,
        duplicate: true,
        error: "Duplicate manuscript content detected — this file matches an existing submission.",
      };
    }
  }

  const objectKey = buildObjectKey({ fileName, fileHash, isSITConference });
  const uploadUrl = await getPresignedUploadUrl(objectKey, fileType);

  await logAuditEvent({
    userId: owned.userId,
    action: "file.upload_url_requested",
    resourceId: manuscriptId,
    metadata: { fileName, fileType, objectKey },
  });

  return { success: true, data: { uploadUrl, objectKey } };
}

export async function confirmUploadAction(
  input: unknown
): Promise<UploadActionResult<{ fileUrl: string; editorialRouting: "SIT_TRACK" | "STANDARD_TRACK" }>> {
  const parsed = uploadConfirmSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid upload confirmation." };
  }
  const { manuscriptId, objectKey, fileHash, isSITConference } = parsed.data;

  const owned = await getOwnedDraftManuscript(manuscriptId);
  if ("error" in owned) return { success: false, error: owned.error };

  const fileUrl = buildStoredFileUrl(objectKey);

  await db.manuscript.update({
    where: { id: manuscriptId },
    data: {
      file_url: fileUrl,
      file_hash: fileHash,
      sit_conference_flag: isSITConference,
    },
  });

  await logAuditEvent({
    userId: owned.userId,
    action: "file.upload_confirmed",
    resourceId: manuscriptId,
    metadata: { objectKey, fileHash },
  });

  revalidatePath(`/submissions/${manuscriptId}`);

  return {
    success: true,
    data: { fileUrl, editorialRouting: isSITConference ? "SIT_TRACK" : "STANDARD_TRACK" },
  };
}
