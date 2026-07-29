"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { buildObjectKey, buildStoredFileUrl, getPresignedUploadUrl } from "@/lib/storage/r2";

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
const ALLOWED_EXTENSIONS = ["pdf", "doc", "docx"];

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

  return { manuscript } as const;
}

function getFileExtension(fileName: string): string {
  return fileName.includes(".") ? fileName.split(".").pop()!.toLowerCase() : "";
}

export async function requestUploadUrlAction({
  manuscriptId,
  fileName,
  fileSize,
  fileType,
  fileHash,
  isSITConference,
  overrideDuplicate,
}: {
  manuscriptId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileHash: string;
  isSITConference: boolean;
  overrideDuplicate?: boolean;
}): Promise<UploadActionResult<{ uploadUrl: string; objectKey: string }>> {
  const owned = await getOwnedDraftManuscript(manuscriptId);
  if ("error" in owned) return { success: false, error: owned.error };

  if (fileSize > MAX_FILE_SIZE_BYTES) {
    return { success: false, error: "File exceeds the 25MB size limit." };
  }

  const extension = getFileExtension(fileName);
  if (!ALLOWED_MIME_TYPES.includes(fileType as (typeof ALLOWED_MIME_TYPES)[number]) || !ALLOWED_EXTENSIONS.includes(extension)) {
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

  return { success: true, data: { uploadUrl, objectKey } };
}

export async function confirmUploadAction({
  manuscriptId,
  objectKey,
  fileHash,
  isSITConference,
}: {
  manuscriptId: string;
  objectKey: string;
  fileHash: string;
  isSITConference: boolean;
}): Promise<UploadActionResult<{ fileUrl: string; editorialRouting: "SIT_TRACK" | "STANDARD_TRACK" }>> {
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

  revalidatePath(`/submissions/${manuscriptId}`);

  return {
    success: true,
    data: { fileUrl, editorialRouting: isSITConference ? "SIT_TRACK" : "STANDARD_TRACK" },
  };
}
