"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { getManuscriptCode } from "@/lib/manuscript-code";
import { assertTransition, InvalidStateTransitionError, UnauthorizedTransitionError, type Actor } from "@/lib/state-machine/manuscript";
import { onManuscriptPublished } from "@/lib/search/manuscripts";
import { logAuditEvent } from "@/lib/audit/logger";
import type { ActionResult } from "./submission";
import type { Manuscript, ManuscriptStatus } from "@/generated/prisma/client";

// Same local-helper-per-file pattern as editorial.ts's getAuthorizedEditor()
// and admin-system.ts's getAuthorizedSuperAdmin() — this codebase doesn't
// share these across files, so this follows the existing convention rather
// than introducing a new shared one.
async function getAuthorizedSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (getUserRole(user) !== "SUPER_ADMIN") return null;
  return user;
}

// The full post-submission workflow a Super Admin needs visibility into —
// deliberately excludes DRAFT (not yet the Super Admin's concern) and
// PUBLISHED (already visible via the public site) to keep this a working
// queue rather than a full historical archive.
const WORKFLOW_STATUSES: ManuscriptStatus[] = [
  "SUBMITTED",
  "UNDER_REVIEW",
  "RESUBMITTED",
  "REVISION_REQUIRED",
  "APPROVED",
  "PAYMENT_PENDING",
  "PAYMENT_COMPLETED",
  "REJECTED",
];

export interface WorkflowPaymentInfo {
  reference: string; // Razorpay order ID, or the MANUAL-... ref for offline payments
  gateway: "razorpay" | "manual";
  gatewayPaymentId: string | null;
  verifiedAt: Date;
}

export interface WorkflowRow extends Manuscript {
  manuscriptCode: string;
  primaryAuthorName: string;
  latestPayment: WorkflowPaymentInfo | null;
}

export async function getSuperAdminManuscriptWorkflowAction(): Promise<WorkflowRow[]> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) return [];

  const manuscripts = await db.manuscript.findMany({
    where: { status: { in: WORKFLOW_STATUSES } },
    orderBy: { updated_at: "desc" },
  });

  const authorIds = [...new Set(manuscripts.map((m) => m.primary_author_id))];
  const authors = await db.user.findMany({ where: { id: { in: authorIds } } });
  const nameById = new Map(authors.map((a) => [a.id, a.full_name]));

  const manuscriptIds = manuscripts.map((m) => m.id);
  const payments = await db.payment.findMany({
    where: { manuscript_id: { in: manuscriptIds }, status: "COMPLETED" },
    orderBy: { created_at: "desc" },
  });
  const latestPaymentByManuscriptId = new Map<string, WorkflowPaymentInfo>();
  for (const payment of payments) {
    if (latestPaymentByManuscriptId.has(payment.manuscript_id)) continue;
    const log = (payment.gateway_log ?? {}) as Record<string, unknown>;
    latestPaymentByManuscriptId.set(payment.manuscript_id, {
      reference: payment.transaction_ref,
      gateway: log.manual === true ? "manual" : "razorpay",
      gatewayPaymentId: typeof log.razorpay_payment_id === "string" ? log.razorpay_payment_id : null,
      verifiedAt: payment.updated_at,
    });
  }

  return manuscripts.map((m) => ({
    ...m,
    manuscriptCode: getManuscriptCode(m.id, m.created_at),
    primaryAuthorName: nameById.get(m.primary_author_id) ?? "Unknown",
    latestPayment: latestPaymentByManuscriptId.get(m.id) ?? null,
  }));
}

async function recordTransition(manuscriptId: string, from: ManuscriptStatus, to: ManuscriptStatus, actorId: string) {
  await db.manuscriptAuditLog.create({
    data: { manuscript_id: manuscriptId, from_state: from, to_state: to, actor_id: actorId },
  });
  await logAuditEvent({
    userId: actorId,
    action: "manuscript.transition",
    resourceId: manuscriptId,
    metadata: { from, to },
  });
}

// Phase 3 note: the gateway (Razorpay) is now the normal path — a
// researcher pays via initiatePaymentAction/verifyPaymentAction
// (src/lib/actions/payment.ts) and the webhook
// (src/app/api/webhooks/razorpay/route.ts) confirms it automatically, with
// no Super Admin action needed. This function is RETAINED as a deliberate,
// separate manual/offline override — the journal's own public Publication
// Charges page already advertises fee waivers and offline arrangements
// (bank transfer, waived fees for early-career researchers, etc.), and
// there's no other way to record those without a real gateway transaction.
// It stays SUPER_ADMIN-only with full audit logging, and is clearly marked
// gateway: "manual" (via gateway_log) so it's never confused with a real
// verified payment in the workflow table below.
export async function markPaymentReceivedAction(manuscriptId: string): Promise<ActionResult> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) {
    return { success: false, errors: { _form: ["You must be signed in as a Super Admin."] } };
  }

  const existing = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!existing) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
  }
  if (existing.status !== "APPROVED" && existing.status !== "PAYMENT_PENDING") {
    return {
      success: false,
      errors: { _form: ["Payment can only be recorded for an approved manuscript awaiting payment."] },
    };
  }

  const actor: Actor = "SUPER_ADMIN";

  if (existing.status === "APPROVED") {
    try {
      assertTransition("APPROVED", "PAYMENT_PENDING", actor);
    } catch (err) {
      if (err instanceof InvalidStateTransitionError || err instanceof UnauthorizedTransitionError) {
        return { success: false, errors: { _form: ["You are not authorized to record payment for this manuscript."] } };
      }
      throw err;
    }
    const step = await db.manuscript.updateMany({
      where: { id: manuscriptId, status: "APPROVED" },
      data: { status: "PAYMENT_PENDING" },
    });
    if (step.count === 0) {
      return { success: false, errors: { _form: ["This manuscript's status already changed. Please refresh and try again."] } };
    }
    await recordTransition(manuscriptId, "APPROVED", "PAYMENT_PENDING", admin.id);
  }

  try {
    assertTransition("PAYMENT_PENDING", "PAYMENT_COMPLETED", actor);
  } catch (err) {
    if (err instanceof InvalidStateTransitionError || err instanceof UnauthorizedTransitionError) {
      return { success: false, errors: { _form: ["You are not authorized to record payment for this manuscript."] } };
    }
    throw err;
  }

  const step2 = await db.manuscript.updateMany({
    where: { id: manuscriptId, status: "PAYMENT_PENDING" },
    data: { status: "PAYMENT_COMPLETED" },
  });
  if (step2.count === 0) {
    return { success: false, errors: { _form: ["This manuscript's status already changed. Please refresh and try again."] } };
  }
  await recordTransition(manuscriptId, "PAYMENT_PENDING", "PAYMENT_COMPLETED", admin.id);

  await db.payment.create({
    data: {
      transaction_ref: `MANUAL-${manuscriptId}-${Date.now()}`,
      manuscript_id: manuscriptId,
      amount: 0,
      currency: "USD",
      gateway_log: {
        manual: true,
        confirmedBy: admin.id,
        note: "Manually confirmed by a Super Admin — no payment gateway integrated yet (Phase 1).",
      },
      status: "COMPLETED",
    },
  });

  revalidatePath("/control-center/manuscripts");
  revalidatePath(`/submissions/${manuscriptId}`);
  revalidatePath("/dashboard");
  return { success: true };
}

// Deliberately only accepts PAYMENT_COMPLETED as the starting state — the
// state machine's graph no longer has an APPROVED -> PUBLISHED edge at all
// (see src/lib/state-machine/manuscript.ts), so this is the only way a
// manuscript can ever reach PUBLISHED: approval AND recorded payment,
// always in that order.
export async function publishManuscriptAction(manuscriptId: string): Promise<ActionResult> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) {
    return { success: false, errors: { _form: ["You must be signed in as a Super Admin."] } };
  }

  const existing = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!existing) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
  }
  if (existing.status !== "PAYMENT_COMPLETED") {
    return { success: false, errors: { _form: ["This manuscript can only be published after payment has been recorded."] } };
  }

  try {
    assertTransition("PAYMENT_COMPLETED", "PUBLISHED", "SUPER_ADMIN");
  } catch (err) {
    if (err instanceof InvalidStateTransitionError || err instanceof UnauthorizedTransitionError) {
      return { success: false, errors: { _form: ["You are not authorized to publish this manuscript."] } };
    }
    throw err;
  }

  // published_at is set only here, guarded by the same atomic CAS as the
  // status write (the WHERE clause only matches while still
  // PAYMENT_COMPLETED) — since PUBLISHED has no outgoing edges in the state
  // graph, this update can only ever succeed once per manuscript, so
  // there's no separate "don't overwrite if already set" check needed.
  const result = await db.manuscript.updateMany({
    where: { id: manuscriptId, status: "PAYMENT_COMPLETED" },
    data: { status: "PUBLISHED", published_at: new Date() },
  });
  if (result.count === 0) {
    return { success: false, errors: { _form: ["This manuscript's status already changed. Please refresh and try again."] } };
  }

  await recordTransition(manuscriptId, "PAYMENT_COMPLETED", "PUBLISHED", admin.id);
  await onManuscriptPublished(manuscriptId);

  revalidatePath("/control-center/manuscripts");
  revalidatePath(`/submissions/${manuscriptId}`);
  revalidatePath(`/articles/${manuscriptId}`);
  revalidatePath("/dashboard");
  return { success: true };
}
