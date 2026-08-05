"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { sendEditorialDecisionEmail, sendReminderEmail } from "@/lib/email";
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

const UNASSIGNED_ALERT_THRESHOLD_DAYS = 5;
const PAGE_SIZE_DEFAULT = 10;

export interface TriageQueueRow extends QueueRow {
  institution: string;
  assignedEditorName: string | null;
}

export interface TriagePage {
  rows: TriageQueueRow[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface TriageSummary {
  newUnassigned: number;
  inPeerReview: number;
  awaitingRevision: number;
  awaitingPayment: number;
  staleUnassignedCount: number;
}

export async function getTriageSummaryAction(): Promise<TriageSummary> {
  const editor = await getAuthorizedEditor();
  if (!editor) {
    return { newUnassigned: 0, inPeerReview: 0, awaitingRevision: 0, awaitingPayment: 0, staleUnassignedCount: 0 };
  }

  const counts = await db.manuscript.groupBy({
    by: ["status"],
    _count: true,
    where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUIRED", "PAYMENT_PENDING"] } },
  });
  const countByStatus = Object.fromEntries(counts.map((c) => [c.status, c._count])) as Record<string, number>;

  const staleUnassignedCount = await db.manuscript.count({
    where: {
      status: "SUBMITTED",
      updated_at: { lt: new Date(Date.now() - UNASSIGNED_ALERT_THRESHOLD_DAYS * 24 * 60 * 60 * 1000) },
    },
  });

  return {
    newUnassigned: countByStatus.SUBMITTED ?? 0,
    inPeerReview: countByStatus.UNDER_REVIEW ?? 0,
    awaitingRevision: countByStatus.REVISION_REQUIRED ?? 0,
    awaitingPayment: countByStatus.PAYMENT_PENDING ?? 0,
    staleUnassignedCount,
  };
}

export async function getAdminTriageQueueAction({
  page = 1,
  limit = PAGE_SIZE_DEFAULT,
  status,
  track,
  category,
  search,
}: {
  page?: number;
  limit?: number;
  status?: ManuscriptStatus;
  track?: "SIT_CONF" | "STANDARD";
  category?: string;
  search?: string;
} = {}): Promise<TriagePage> {
  const editor = await getAuthorizedEditor();
  if (!editor) {
    return { rows: [], totalCount: 0, page: 1, limit, totalPages: 0 };
  }

  const safePage = Math.max(1, Math.floor(page) || 1);

  const where = {
    status: { in: status ? [status] : QUEUE_STATUSES },
    ...(category ? { subject_category: category } : {}),
    ...(track ? { sit_conference_flag: track === "SIT_CONF" } : {}),
    ...(search ? { title: { contains: search, mode: "insensitive" as const } } : {}),
  };

  const totalCount = await db.manuscript.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  // Out-of-bounds pages fall back to the last valid page rather than erroring.
  const effectivePage = Math.min(safePage, totalPages);

  const manuscripts = await db.manuscript.findMany({
    where,
    orderBy: { updated_at: "asc" },
    skip: (effectivePage - 1) * limit,
    take: limit,
  });

  const userIds = [
    ...new Set(manuscripts.flatMap((m) => [m.primary_author_id, m.assigned_editor_id]).filter((id): id is string => Boolean(id))),
  ];
  const users = await db.user.findMany({ where: { id: { in: userIds } } });
  const nameById = new Map(users.map((u) => [u.id, u.full_name]));

  const now = Date.now();
  const rows: TriageQueueRow[] = manuscripts.map((m) => {
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
      primaryAuthorName: nameById.get(m.primary_author_id) ?? "Unknown",
      hasOrcidOnFile: Boolean(correspondingAuthor?.orcid),
      institution: m.institution,
      assignedEditorName: m.assigned_editor_id ? (nameById.get(m.assigned_editor_id) ?? "Unknown") : null,
    };
  });

  return { rows, totalCount, page: effectivePage, limit, totalPages };
}

export async function getAvailableEditorsAction(): Promise<{ id: string; fullName: string }[]> {
  const editor = await getAuthorizedEditor();
  if (!editor) return [];

  const editors = await db.user.findMany({
    where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } },
    orderBy: { full_name: "asc" },
  });
  return editors.map((e) => ({ id: e.id, fullName: e.full_name }));
}

export async function assignEditorAction({
  manuscriptId,
  editorId,
}: {
  manuscriptId: string;
  editorId: string | null;
}): Promise<ActionResult> {
  const editor = await getAuthorizedEditor();
  if (!editor) {
    return { success: false, errors: { _form: ["You must be signed in as an editor."] } };
  }

  await db.manuscript.update({
    where: { id: manuscriptId },
    data: { assigned_editor_id: editorId },
  });

  revalidatePath("/review");
  revalidatePath(`/review/${manuscriptId}`);
  return { success: true };
}

export interface AuditTrailEntry {
  fromState: ManuscriptStatus;
  toState: ManuscriptStatus;
  actorName: string | null;
  createdAt: Date;
}

export async function getManuscriptAuditTrailAction(manuscriptId: string): Promise<AuditTrailEntry[]> {
  const editor = await getAuthorizedEditor();
  if (!editor) return [];

  const entries = await db.manuscriptAuditLog.findMany({
    where: { manuscript_id: manuscriptId },
    orderBy: { created_at: "desc" },
  });

  const actorIds = [...new Set(entries.map((e) => e.actor_id).filter((id): id is string => Boolean(id)))];
  const actors = await db.user.findMany({ where: { id: { in: actorIds } } });
  const nameById = new Map(actors.map((a) => [a.id, a.full_name]));

  return entries.map((e) => ({
    fromState: e.from_state,
    toState: e.to_state,
    actorName: e.actor_id ? (nameById.get(e.actor_id) ?? "Unknown") : "System",
    createdAt: e.created_at,
  }));
}

export async function sendAuthorReminderAction({ manuscriptId }: { manuscriptId: string }): Promise<ActionResult> {
  const editor = await getAuthorizedEditor();
  if (!editor) {
    return { success: false, errors: { _form: ["You must be signed in as an editor."] } };
  }

  const manuscript = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!manuscript) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
  }

  const primaryAuthor = await db.user.findUnique({ where: { id: manuscript.primary_author_id } });
  if (!primaryAuthor) {
    return { success: false, errors: { _form: ["Primary author not found."] } };
  }

  await sendReminderEmail(
    primaryAuthor.email,
    manuscript.title,
    getManuscriptCode(manuscript.id, manuscript.created_at),
    manuscript.status.replace(/_/g, " ").toLowerCase()
  );

  return { success: true };
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
