"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { makeSubmitSchema, SUBJECT_CATEGORIES, type AuthorInput } from "@/lib/validations/submission";
import { sendSubmissionConfirmationEmail } from "@/lib/email";
import { getManuscriptCode } from "@/lib/manuscript-code";
import { getJournalSettings, getEnabledCategoryKeys } from "@/lib/journal-settings";
import {
  assertTransition,
  InvalidStateTransitionError,
  UnauthorizedTransitionError,
  type Actor,
} from "@/lib/state-machine/manuscript";
import { getAuthorizedUser, type ActionResult } from "./submission";
import { logAuditEvent } from "@/lib/audit/logger";

// Finalizing operates on whatever is already persisted (SubmissionForm
// autosaves via saveDraftAction as the user edits) rather than taking a form
// payload directly — the state machine transitions the stored entity, not an
// ad-hoc client value. Callers should saveDraftAction() first if there are
// unsaved edits, then call this.
export async function finalizeSubmissionAction({
  manuscriptId,
}: {
  manuscriptId: string;
}): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthorizedUser();
  if (!user) {
    return {
      success: false,
      errors: { _form: ["You must be signed in as a researcher to submit a manuscript."] },
    };
  }

  const existing = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!existing || existing.primary_author_id !== user.id) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
  }

  const role = getUserRole(user) as Actor;
  try {
    assertTransition(existing.status, "SUBMITTED", role);
  } catch (err) {
    if (err instanceof InvalidStateTransitionError) {
      return {
        success: false,
        errors: { _form: ["This manuscript can no longer be submitted from its current status."] },
      };
    }
    if (err instanceof UnauthorizedTransitionError) {
      return { success: false, errors: { _form: ["You are not authorized to submit this manuscript."] } };
    }
    throw err;
  }

  const candidate = {
    title: existing.title,
    abstract: existing.abstract,
    keywords: existing.keywords,
    authors: Array.isArray(existing.co_authors) ? (existing.co_authors as AuthorInput[]) : [],
    category: SUBJECT_CATEGORIES.find((c) => c === existing.subject_category),
    references: Array.isArray(existing.references) ? (existing.references as string[]) : [],
  };
  const [{ abstract_word_limit }, enabledCategories] = await Promise.all([
    getJournalSettings(),
    getEnabledCategoryKeys(),
  ]);
  const parsed = makeSubmitSchema(abstract_word_limit).safeParse(candidate);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  // Re-checked here, not just in saveDraftAction: a category can be enabled
  // when the draft was saved and disabled by a SUPER_ADMIN before the author
  // hits submit — this is the last point before the manuscript leaves DRAFT.
  if (!enabledCategories.has(parsed.data.category)) {
    return { success: false, errors: { category: ["This category is no longer accepting submissions."] } };
  }

  if (!existing.file_url || !existing.file_hash) {
    return {
      success: false,
      errors: { _form: ["A manuscript file must be uploaded before submission."] },
    };
  }

  const duplicate = await db.manuscript.findFirst({
    where: {
      file_hash: existing.file_hash,
      status: { not: "REJECTED" },
      NOT: { id: manuscriptId },
    },
  });
  if (duplicate) {
    return {
      success: false,
      errors: { _form: ["Duplicate manuscript content detected — this file matches another submission."] },
    };
  }

  const data = parsed.data;
  const correspondingAuthor = data.authors.find((a) => a.isCorresponding)!;

  // Atomic guard against a double-submit race: only succeeds if the row is
  // still DRAFT at the moment of the write.
  const result = await db.manuscript.updateMany({
    where: { id: manuscriptId, status: "DRAFT" },
    data: {
      title: data.title,
      abstract: data.abstract,
      keywords: data.keywords,
      co_authors: data.authors,
      institution: correspondingAuthor.institution,
      subject_category: data.category,
      references: data.references,
      status: "SUBMITTED",
    },
  });

  if (result.count === 0) {
    return {
      success: false,
      errors: {
        _form: ["This manuscript's status changed before your submission went through. Please refresh and try again."],
      },
    };
  }

  await db.manuscriptAuditLog.create({
    data: {
      manuscript_id: manuscriptId,
      from_state: "DRAFT",
      to_state: "SUBMITTED",
      actor_id: user.id,
    },
  });
  await logAuditEvent({
    userId: user.id,
    action: "manuscript.transition",
    resourceId: manuscriptId,
    metadata: { from: "DRAFT", to: "SUBMITTED" },
  });

  const updated = await db.manuscript.findUniqueOrThrow({ where: { id: manuscriptId } });

  await sendSubmissionConfirmationEmail(
    user.email ?? "",
    updated.title,
    getManuscriptCode(updated.id, updated.created_at)
  );

  revalidatePath(`/submissions/${manuscriptId}`);
  revalidatePath("/dashboard");
  // The manuscript now enters the editorial queue for the first time.
  revalidatePath("/review");
  return { success: true, data: { id: manuscriptId } };
}
