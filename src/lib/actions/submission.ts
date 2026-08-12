"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { makeDraftSchema } from "@/lib/validations/submission";
import { getJournalSettings, getEnabledCategoryKeys } from "@/lib/journal-settings";
import { isValidUuid } from "@/lib/id";

// A manuscript stays editable through a revision cycle, not just before its
// first submission: REVISION_REQUIRED is the editor sending it back to the
// author to fix, and the author needs to actually be able to save those
// fixes (and the resubmit flow below re-saves before transitioning to
// RESUBMITTED). Restricting this to DRAFT alone made "revise and resubmit"
// impossible — every edit and re-upload was silently rejected.
const AUTHOR_EDITABLE_STATUSES = ["DRAFT", "REVISION_REQUIRED"] as const;

export type ActionResult<T = unknown> = {
  success: boolean;
  errors?: Record<string, string[]>;
  data?: T;
};

export async function getAuthorizedUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const role = getUserRole(user);
  if (role !== "RESEARCHER" && role !== "SUPER_ADMIN") return null;

  return user;
}

export async function saveDraftAction(
  id: string | null,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthorizedUser();
  if (!user) {
    return { success: false, errors: { _form: ["You must be signed in as a researcher to save a draft."] } };
  }

  const [settings, enabledCategories] = await Promise.all([getJournalSettings(), getEnabledCategoryKeys()]);
  const parsed = makeDraftSchema(settings.abstract_word_limit).safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data;
  if (data.category && !enabledCategories.has(data.category)) {
    return { success: false, errors: { category: ["This category is no longer accepting submissions."] } };
  }

  const correspondingAuthor = data.authors.find((a) => a.isCorresponding);
  const institution =
    correspondingAuthor?.institution ||
    (user.user_metadata?.institutional_affiliation as string | undefined) ||
    "";

  if (id) {
    if (!isValidUuid(id)) {
      return { success: false, errors: { _form: ["Manuscript not found."] } };
    }
    const existing = await db.manuscript.findUnique({ where: { id } });
    if (!existing || existing.primary_author_id !== user.id) {
      return { success: false, errors: { _form: ["Manuscript not found."] } };
    }
    if (!AUTHOR_EDITABLE_STATUSES.includes(existing.status as (typeof AUTHOR_EDITABLE_STATUSES)[number])) {
      return {
        success: false,
        errors: { _form: ["This manuscript has already been submitted and can no longer be edited."] },
      };
    }

    const updated = await db.manuscript.update({
      where: { id },
      data: {
        title: data.title,
        abstract: data.abstract,
        keywords: data.keywords,
        co_authors: data.authors,
        institution,
        subject_category: data.category ?? "",
        references: data.references,
      },
    });

    revalidatePath(`/submissions/${updated.id}`);
    return { success: true, data: { id: updated.id } };
  }

  const created = await db.manuscript.create({
    data: {
      title: data.title,
      abstract: data.abstract,
      keywords: data.keywords,
      primary_author_id: user.id,
      co_authors: data.authors,
      institution,
      subject_category: data.category ?? "",
      references: data.references,
      status: "DRAFT",
    },
  });

  revalidatePath("/dashboard");
  return { success: true, data: { id: created.id } };
}

export async function getSubmission(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (!isValidUuid(id)) return null;

  const manuscript = await db.manuscript.findUnique({ where: { id } });
  if (!manuscript) return null;

  const role = getUserRole(user);
  const isOwner = manuscript.primary_author_id === user.id;

  // ADMIN/SUPER_ADMIN are the reviewer roles (see src/lib/auth/rbac.ts's
  // /review route gating) — they need to view any manuscript to act on it,
  // not just their own.
  if (!isOwner && role !== "SUPER_ADMIN" && role !== "ADMIN") {
    const email = (user.email ?? "").toLowerCase();
    const authors = Array.isArray(manuscript.co_authors)
      ? (manuscript.co_authors as { email?: string }[])
      : [];
    const isCoAuthor = authors.some((a) => (a.email ?? "").toLowerCase() === email);
    if (!isCoAuthor) return null;
  }

  return { ...manuscript, isOwner };
}
