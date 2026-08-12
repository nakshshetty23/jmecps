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
import { onManuscriptPublished } from "@/lib/search/manuscripts";
import { makeSubmitSchema, SUBJECT_CATEGORIES, type AuthorInput } from "@/lib/validations/submission";
import { logAuditEvent } from "@/lib/audit/logger";
import { isValidUuid } from "@/lib/id";

// A generous, fixed ceiling — not the current admin-configured word limit.
// This gate checks the manuscript is *structurally complete* (title,
// keyword count, author structure, etc.), not that it still satisfies
// whatever the word-limit policy happens to be today; re-enforcing a
// possibly-lowered limit against content the author validly submitted
// under an earlier, higher limit would retroactively block it through no
// fault of the author's. The real word-limit enforcement point is
// submission time (finalize-submission.ts).
const PUBLISH_COMPLETENESS_WORD_CEILING = 100_000;

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
  if (!isValidUuid(manuscriptId)) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
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

  // A manuscript reaching PUBLISHED should already have complete metadata
  // (finalize-submission.ts strictly validated it at DRAFT -> SUBMITTED) —
  // but resubmission after a revision request goes through this generic
  // transition without that same re-check, so this closes that gap rather
  // than trusting it's still intact several transitions later. Public
  // search results are built directly from these fields, so an incomplete
  // record would otherwise surface silently broken metadata.
  if (targetStatus === "PUBLISHED") {
    const candidate = {
      title: existing.title,
      abstract: existing.abstract,
      keywords: existing.keywords,
      authors: Array.isArray(existing.co_authors) ? (existing.co_authors as AuthorInput[]) : [],
      category: SUBJECT_CATEGORIES.find((c) => c === existing.subject_category),
      references: Array.isArray(existing.references) ? (existing.references as string[]) : [],
    };
    const parsed = makeSubmitSchema(PUBLISH_COMPLETENESS_WORD_CEILING).safeParse(candidate);
    if (!parsed.success) {
      return {
        success: false,
        errors: { _form: ["This manuscript's metadata is incomplete and cannot be published as-is."] },
      };
    }
  }

  // Atomic guard: only applies if the row is still in the expected state.
  // This is the other path (besides publishManuscriptAction) that can set
  // targetStatus = PUBLISHED — the SUPER_ADMIN "override state" control in
  // EditorialQueueTable.tsx calls this action directly, not the dedicated
  // one — so published_at has to be set here too, under the same guard.
  // PUBLISHED has no outgoing edges (see the state graph), so this can
  // only ever succeed once per manuscript regardless of which path got here.
  const result = await db.manuscript.updateMany({
    where: { id: manuscriptId, status: existing.status },
    data: targetStatus === "PUBLISHED" ? { status: targetStatus, published_at: new Date() } : { status: targetStatus },
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
  await logAuditEvent({
    userId: user.id,
    action: "manuscript.transition",
    resourceId: manuscriptId,
    metadata: { from: existing.status, to: targetStatus },
  });

  // Cache invalidation for the public search/article-detail read layer —
  // see src/lib/search/manuscripts.ts for why this is scoped to PUBLISHED
  // only (the search_vector column that backs matching/ranking is always
  // live; this just clears the cached read results).
  if (targetStatus === "PUBLISHED") {
    await onManuscriptPublished(manuscriptId);
  }

  revalidatePath(`/submissions/${manuscriptId}`);
  revalidatePath("/dashboard");
  // Covers every transition this action handles that affects what the
  // editorial queue should show: author withdraws (drops out), editor
  // approves/rejects/publishes (drops out), or moves to under-review
  // (status label changes in place).
  revalidatePath("/review");
  return { success: true, data: { id: manuscriptId, status: targetStatus } };
}
