import "server-only";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

// Unified categories across manuscript lifecycle, file access, and auth
// events (see the AuditLog model's doc comment for why this exists
// alongside the more specific ManuscriptAuditLog / UserRoleAuditLog tables).
export type AuditAction =
  | "auth.login"
  | "auth.register"
  | "manuscript.transition"
  | "user.role_changed"
  | "file.upload_url_requested"
  | "file.upload_confirmed"
  | "file.download_url_issued"
  | "file.download_denied"
  | "payment.initiated"
  | "payment.verified"
  | "payment.failed"
  | "payment.verification_failed"
  | "payment.webhook_received"
  | "issue.created"
  | "issue.updated"
  | "issue.manuscript_assigned"
  | "issue.manuscript_removed";

export async function logAuditEvent({
  userId,
  action,
  resourceId,
  metadata,
}: {
  userId: string | null;
  action: AuditAction;
  resourceId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    const h = await headers();
    // x-forwarded-for can carry a client-supplied chain behind some
    // proxies; take the first hop only and treat this as best-effort
    // attribution, not a security boundary in itself.
    const ipAddress = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
    const userAgent = h.get("user-agent");

    await db.auditLog.create({
      data: {
        user_id: userId,
        action,
        resource_id: resourceId ?? null,
        ip_address: ipAddress,
        user_agent: userAgent,
        metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    // Audit logging is observability, not a transaction gate — a failure
    // here must never block or roll back the action it's describing.
    console.error("Audit log write failed:", err);
  }
}
