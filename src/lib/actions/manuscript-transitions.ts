"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import {
  assertTransition,
  InvalidStateTransitionError,
  UnauthorizedTransitionError,
  type Actor,
} from "@/lib/state-machine/manuscript";
import type { ManuscriptStatus } from "@/generated/prisma/client";
import type { ActionResult } from "./submission";

// Covers every lifecycle transition except DRAFT -> SUBMITTED (that one has
// extra validation — full metadata re-check, file/hash verification — and
// lives in finalize-submission.ts). Used for the author's Withdraw action and
// the editor's review decisions (move to review, request revision, approve,
// reject, publish). SYSTEM-actor transitions (payment webhook) aren't
// reachable here — there's no payment gateway wired up yet to call them from,
// so only the state machine itself supports that actor today.
export async function transitionManuscriptAction({
  manuscriptId,
  targetStatus,
}: {
  manuscriptId: string;
  targetStatus: ManuscriptStatus;
}): Promise<ActionResult<{ id: string; status: ManuscriptStatus }>> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, errors: { _form: ["You must be signed in to change a manuscript's status."] } };
  }

  const role = getUserRole(user);
  if (role === "VISITOR") {
    return { success: false, errors: { _form: ["You are not authorized to change this manuscript's status."] } };
  }

  const existing = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!existing) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
  }

  const isOwner = existing.primary_author_id === user.id;
  if (role === "RESEARCHER" && !isOwner) {
    return { success: false, errors: { _form: ["You can only change the status of your own manuscripts."] } };
  }

  try {
    assertTransition(existing.status, targetStatus, role as Actor);
  } catch (err) {
    if (err instanceof InvalidStateTransitionError) {
      return { success: false, errors: { _form: [err.message] } };
    }
    if (err instanceof UnauthorizedTransitionError) {
      return { success: false, errors: { _form: ["You are not authorized to make this change."] } };
    }
    throw err;
  }

  // Atomic guard: only applies if the row is still in the expected state.
  const result = await db.manuscript.updateMany({
    where: { id: manuscriptId, status: existing.status },
    data: { status: targetStatus },
  });

  if (result.count === 0) {
    return {
      success: false,
      errors: { _form: ["This manuscript's status already changed. Please refresh and try again."] },
    };
  }

  await db.manuscriptAuditLog.create({
    data: {
      manuscript_id: manuscriptId,
      from_state: existing.status,
      to_state: targetStatus,
      actor_id: user.id,
    },
  });

  revalidatePath(`/submissions/${manuscriptId}`);
  revalidatePath("/dashboard");
  return { success: true, data: { id: manuscriptId, status: targetStatus } };
}
