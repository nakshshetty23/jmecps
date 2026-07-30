"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { sendEditorialDecisionEmail } from "@/lib/email";
import { getManuscriptCode } from "@/lib/manuscript-code";
import {
  assertTransition,
  InvalidStateTransitionError,
  UnauthorizedTransitionError,
  type Actor,
} from "@/lib/state-machine/manuscript";
import type { ActionResult } from "./submission";
import type { EditorialDecision, Manuscript, ManuscriptStatus } from "@/generated/prisma/client";

const QUEUE_STATUSES: ManuscriptStatus[] = ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"];
const REVIEWABLE_STATUSES: ManuscriptStatus[] = ["SUBMITTED", "UNDER_REVIEW", "RESUBMITTED"];

// A soft lock, not a hard DB lock — it just tells other editors "someone is
// already in here." If a tab is closed without releasing it, the lock
// self-heals after this TTL rather than blocking the paper forever.
const LOCK_TTL_MS = 15 * 60 * 1000;

async function getAuthorizedEditor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const role = getUserRole(user);
  if (role !== "ADMIN" && role !== "SUPER_ADMIN") return null;

  return user;
}

function isLockActive(lockAt: Date | null): boolean {
  if (!lockAt) return false;
  return Date.now() - lockAt.getTime() < LOCK_TTL_MS;
}

export interface QueueRow extends Manuscript {
  manuscriptCode: string;
  daysPending: number;
  hoursPending: number;
  lockedByActive: boolean;
  primaryAuthorName: string;
  hasOrcidOnFile: boolean;
}

export async function getPendingQueueAction({
  category,
  track,
  reviewStatus,
}: {
  category?: string;
  track?: "SIT_CONF" | "STANDARD";
  reviewStatus?: "unassigned" | "in-review" | "revision-pending";
} = {}): Promise<QueueRow[]> {
  const editor = await getAuthorizedEditor();
  if (!editor) return [];

  const statusFilter: ManuscriptStatus[] =
    reviewStatus === "unassigned"
      ? ["SUBMITTED"]
      : reviewStatus === "in-review"
        ? ["UNDER_REVIEW"]
        : reviewStatus === "revision-pending"
          ? ["RESUBMITTED"]
          : QUEUE_STATUSES;

  const manuscripts = await db.manuscript.findMany({
    where: {
      status: { in: statusFilter },
      ...(category ? { subject_category: category } : {}),
      ...(track ? { sit_conference_flag: track === "SIT_CONF" } : {}),
    },
    // Verification age is derived from updated_at: while a manuscript sits in
    // one of the queue statuses, nothing touches it except an editor's own
    // action (which moves it out of the queue) — so this timestamp reliably
    // reflects "since when has this been waiting," without a dedicated column.
    orderBy: { updated_at: "asc" },
  });

  const authorIds = [...new Set(manuscripts.map((m) => m.primary_author_id))];
  const authors = await db.user.findMany({ where: { id: { in: authorIds } } });
  const authorNameById = new Map(authors.map((a) => [a.id, a.full_name]));

  const now = Date.now();
  return manuscripts.map((m) => {
    const elapsedMs = now - m.updated_at.getTime();
    const coAuthors = Array.isArray(m.co_authors)
      ? (m.co_authors as { isCorresponding?: boolean; orcid?: string }[])
      : [];
    const correspondingAuthor = coAuthors.find((a) => a.isCorresponding) ?? coAuthors[0];
    return {
      ...m,
      manuscriptCode: getManuscriptCode(m.id, m.created_at),
      daysPending: Math.floor(elapsedMs / (24 * 60 * 60 * 1000)),
      hoursPending: Math.floor(elapsedMs / (60 * 60 * 1000)),
      lockedByActive: isLockActive(m.review_lock_at),
      primaryAuthorName: authorNameById.get(m.primary_author_id) ?? "Unknown",
      hasOrcidOnFile: Boolean(correspondingAuthor?.orcid),
    };
  });
}

export interface ManuscriptForReview {
  manuscript: Manuscript;
  manuscriptCode: string;
  primaryAuthor: { fullName: string; email: string } | null;
  draftReview: {
    internalNotes: string;
    authorNotes: string;
    rubricScores: Record<string, number>;
  } | null;
  lock: { heldByMe: boolean; heldBySomeoneElse: boolean; holderName: string | null };
}

export async function getManuscriptForReview(manuscriptId: string): Promise<ManuscriptForReview | null> {
  const editor = await getAuthorizedEditor();
  if (!editor) return null;

  const manuscript = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!manuscript) return null;

  const primaryAuthorRow = await db.user.findUnique({ where: { id: manuscript.primary_author_id } });

  const draft = await db.editorialReview.findFirst({
    where: { manuscript_id: manuscriptId, decision: null },
    orderBy: { created_at: "desc" },
  });

  const lockActive = isLockActive(manuscript.review_lock_at);
  const heldByMe = lockActive && manuscript.review_lock_by === editor.id;
  const heldBySomeoneElse = lockActive && manuscript.review_lock_by !== editor.id;
  let holderName: string | null = null;
  if (heldBySomeoneElse && manuscript.review_lock_by) {
    const holder = await db.user.findUnique({ where: { id: manuscript.review_lock_by } });
    holderName = holder?.full_name ?? "another editor";
  }

  return {
    manuscript,
    manuscriptCode: getManuscriptCode(manuscript.id, manuscript.created_at),
    primaryAuthor: primaryAuthorRow ? { fullName: primaryAuthorRow.full_name, email: primaryAuthorRow.email } : null,
    draftReview: draft
      ? {
          internalNotes: draft.internal_notes,
          authorNotes: draft.author_notes,
          rubricScores: (draft.rubric_scores as Record<string, number>) ?? {},
        }
      : null,
    lock: { heldByMe, heldBySomeoneElse, holderName },
  };
}

export async function acquireReviewLockAction({
  manuscriptId,
}: {
  manuscriptId: string;
}): Promise<ActionResult<{ acquired: boolean }>> {
  const editor = await getAuthorizedEditor();
  if (!editor) {
    return { success: false, errors: { _form: ["You must be signed in as an editor."] } };
  }

  const manuscript = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!manuscript) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
  }

  if (isLockActive(manuscript.review_lock_at) && manuscript.review_lock_by !== editor.id) {
    const holder = await db.user.findUnique({ where: { id: manuscript.review_lock_by! } });
    return {
      success: false,
      errors: { _form: [`${holder?.full_name ?? "Another editor"} is currently reviewing this paper.`] },
    };
  }

  await db.manuscript.update({
    where: { id: manuscriptId },
    data: { review_lock_by: editor.id, review_lock_at: new Date() },
  });

  return { success: true, data: { acquired: true } };
}

export async function releaseReviewLockAction({ manuscriptId }: { manuscriptId: string }): Promise<void> {
  const editor = await getAuthorizedEditor();
  if (!editor) return;

  await db.manuscript.updateMany({
    where: { id: manuscriptId, review_lock_by: editor.id },
    data: { review_lock_by: null, review_lock_at: null },
  });
}

export async function saveEditorialNotesAction({
  manuscriptId,
  internalNotes,
  authorNotes,
  rubricScores,
}: {
  manuscriptId: string;
  internalNotes: string;
  authorNotes: string;
  rubricScores: Record<string, number>;
}): Promise<ActionResult> {
  const editor = await getAuthorizedEditor();
  if (!editor) {
    return { success: false, errors: { _form: ["You must be signed in as an editor."] } };
  }

  const existingDraft = await db.editorialReview.findFirst({
    where: { manuscript_id: manuscriptId, decision: null },
    orderBy: { created_at: "desc" },
  });

  if (existingDraft) {
    await db.editorialReview.update({
      where: { id: existingDraft.id },
      data: { internal_notes: internalNotes, author_notes: authorNotes, rubric_scores: rubricScores, reviewer_id: editor.id },
    });
  } else {
    await db.editorialReview.create({
      data: {
        manuscript_id: manuscriptId,
        reviewer_id: editor.id,
        internal_notes: internalNotes,
        author_notes: authorNotes,
        rubric_scores: rubricScores,
      },
    });
  }

  return { success: true };
}

export async function submitEditorialDecisionAction({
  manuscriptId,
  decision,
  reviewNotes,
  internalNotes,
  rubricScores,
  revisionDeadline,
}: {
  manuscriptId: string;
  decision: EditorialDecision;
  reviewNotes: string;
  internalNotes: string;
  rubricScores: Record<string, number>;
  revisionDeadline?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const editor = await getAuthorizedEditor();
  if (!editor) {
    return { success: false, errors: { _form: ["You must be signed in as an editor."] } };
  }

  const existing = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!existing) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
  }

  // State Safety: decisions only make sense while a manuscript is actually
  // sitting in the editor's queue.
  if (!REVIEWABLE_STATUSES.includes(existing.status)) {
    return {
      success: false,
      errors: { _form: ["This manuscript is not currently awaiting an editorial decision."] },
    };
  }

  const role = getUserRole(editor) as Actor;
  try {
    assertTransition(existing.status, decision, role);
  } catch (err) {
    if (err instanceof InvalidStateTransitionError) {
      return { success: false, errors: { _form: ["This decision is not valid from the manuscript's current status."] } };
    }
    if (err instanceof UnauthorizedTransitionError) {
      return { success: false, errors: { _form: ["You are not authorized to make this decision."] } };
    }
    throw err;
  }

  const result = await db.manuscript.updateMany({
    where: { id: manuscriptId, status: existing.status },
    data: { status: decision, review_lock_by: null, review_lock_at: null },
  });

  if (result.count === 0) {
    return {
      success: false,
      errors: { _form: ["This manuscript's status changed before your decision went through. Please refresh and try again."] },
    };
  }

  await db.manuscriptAuditLog.create({
    data: {
      manuscript_id: manuscriptId,
      from_state: existing.status,
      to_state: decision,
      actor_id: editor.id,
    },
  });

  const draft = await db.editorialReview.findFirst({
    where: { manuscript_id: manuscriptId, decision: null },
    orderBy: { created_at: "desc" },
  });
  const deadline = revisionDeadline ? new Date(revisionDeadline) : null;

  if (draft) {
    await db.editorialReview.update({
      where: { id: draft.id },
      data: {
        internal_notes: internalNotes,
        author_notes: reviewNotes,
        rubric_scores: rubricScores,
        decision,
        revision_deadline: deadline,
        reviewer_id: editor.id,
      },
    });
  } else {
    await db.editorialReview.create({
      data: {
        manuscript_id: manuscriptId,
        reviewer_id: editor.id,
        internal_notes: internalNotes,
        author_notes: reviewNotes,
        rubric_scores: rubricScores,
        decision,
        revision_deadline: deadline,
      },
    });
  }

  const primaryAuthor = await db.user.findUnique({ where: { id: existing.primary_author_id } });
  if (primaryAuthor) {
    await sendEditorialDecisionEmail(
      primaryAuthor.email,
      existing.title,
      getManuscriptCode(existing.id, existing.created_at),
      decision,
      reviewNotes,
      deadline
    );
  }

  revalidatePath(`/submissions/${manuscriptId}`);
  revalidatePath(`/review/${manuscriptId}`);
  revalidatePath("/review");
  revalidatePath("/dashboard");

  return { success: true, data: { id: manuscriptId } };
}
