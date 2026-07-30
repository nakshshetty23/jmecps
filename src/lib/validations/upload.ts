import { z } from "zod";

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;

const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const SHA256_HEX = /^[0-9a-f]{64}$/;

export const uploadRequestSchema = z.object({
  manuscriptId: z.string().uuid("Invalid manuscript id"),
  fileName: z.string().min(1).max(255),
  fileSize: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES, "File exceeds the 25MB size limit"),
  fileType: z.enum(ALLOWED_UPLOAD_MIME_TYPES, { message: "Only PDF and Word documents are allowed" }),
  fileHash: z.string().regex(SHA256_HEX, "Invalid file hash"),
  isSITConference: z.boolean(),
  overrideDuplicate: z.boolean().optional(),
});

export const uploadConfirmSchema = z.object({
  manuscriptId: z.string().uuid("Invalid manuscript id"),
  objectKey: z.string().min(1),
  fileHash: z.string().regex(SHA256_HEX, "Invalid file hash"),
  isSITConference: z.boolean(),
});

export type UploadRequestInput = z.infer<typeof uploadRequestSchema>;
export type UploadConfirmInput = z.infer<typeof uploadConfirmSchema>;
