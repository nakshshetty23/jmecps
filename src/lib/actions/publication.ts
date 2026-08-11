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

export interface WorkflowRow extends Manuscript {
  manuscriptCode: string;
  primaryAuthorName: string;
  latestPaymentAt: Date | null;
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
  const latestPaymentByManuscriptId = new Map<string, Date>();
  for (const payment of payments) {
    if (!latestPaymentByManuscriptId.has(payment.manuscript_id)) {
      latestPaymentByManuscriptId.set(payment.manuscript_id, payment.created_at);
    }
  }

  return manuscripts.map((m) => ({
    ...m,
    manuscriptCode: getManuscriptCode(m.id, m.created_at),
    primaryAuthorName: nameById.get(m.primary_author_id) ?? "Unknown",
    latestPaymentAt: latestPaymentByManuscriptId.get(m.id) ?? null,
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

// No payment gateway exists yet (Phase 1) — this is the manual override a
// Super Admin uses to record that payment has actually come in through
// some out-of-band channel. Moves APPROVED -> PAYMENT_PENDING ->
// PAYMENT_COMPLETED (both hops, since there's no gateway to pause on
// PAYMENT_PENDING for in between) and creates a real Payment row — a bare
// status flip wouldn't "identify that the payment was manually confirmed"
// the way the task requires, so this uses the existing Payment model
// (gateway_log is a free-form Json field, exactly suited to recording a
// manual-confirmation marker) rather than adding new schema.
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

  const result = await db.manuscript.updateMany({
    where: { id: manuscriptId, status: "PAYMENT_COMPLETED" },
    data: { status: "PUBLISHED" },
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
