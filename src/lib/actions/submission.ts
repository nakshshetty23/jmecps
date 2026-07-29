"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { draftSchema, submitSchema } from "@/lib/validations/submission";

export type ActionResult<T = unknown> = {
  success: boolean;
  errors?: Record<string, string[]>;
  data?: T;
};

async function getAuthorizedUser() {
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

  const parsed = draftSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const data = parsed.data;
  const correspondingAuthor = data.authors.find((a) => a.isCorresponding);
  const institution =
    correspondingAuthor?.institution ||
    (user.user_metadata?.institutional_affiliation as string | undefined) ||
    "";

  if (id) {
    const existing = await db.manuscript.findUnique({ where: { id } });
    if (!existing || existing.primary_author_id !== user.id) {
      return { success: false, errors: { _form: ["Manuscript not found."] } };
    }
    if (existing.status !== "DRAFT") {
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

export async function submitManuscriptAction(
  id: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  const user = await getAuthorizedUser();
  if (!user) {
    return {
      success: false,
      errors: { _form: ["You must be signed in as a researcher to submit a manuscript."] },
    };
  }

  const parsed = submitSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }

  const existing = await db.manuscript.findUnique({ where: { id } });
  if (!existing || existing.primary_author_id !== user.id) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
  }
  if (existing.status !== "DRAFT") {
    return { success: false, errors: { _form: ["This manuscript has already been submitted."] } };
  }
  // No file-upload module exists yet in this build (out of scope for this
  // task per the metadata-only spec) — block submission honestly rather
  // than allow a fileless "SUBMITTED" manuscript.
  if (!existing.file_url) {
    return {
      success: false,
      errors: {
        _form: [
          "A manuscript file must be uploaded before submission. File upload isn't available in this build yet — save as a draft for now.",
        ],
      },
    };
  }

  const data = parsed.data;
  const correspondingAuthor = data.authors.find((a) => a.isCorresponding)!;

  const updated = await db.manuscript.update({
    where: { id },
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

  revalidatePath(`/submissions/${updated.id}`);
  revalidatePath("/dashboard");
  return { success: true, data: { id: updated.id } };
}

export async function getSubmission(id: string) {
  const user = await getAuthorizedUser();
  if (!user) return null;

  const manuscript = await db.manuscript.findUnique({ where: { id } });
  if (!manuscript) return null;

  const role = getUserRole(user);
  if (manuscript.primary_author_id !== user.id && role !== "SUPER_ADMIN") return null;

  return manuscript;
}
