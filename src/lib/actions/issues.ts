"use server";

import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { getManuscriptCode } from "@/lib/manuscript-code";
import { logAuditEvent } from "@/lib/audit/logger";
import { Prisma } from "@/generated/prisma/client";
import type { ActionResult } from "./submission";

// Same local-helper-per-file pattern as editorial.ts's getAuthorizedEditor(),
// admin-system.ts's and publication.ts's getAuthorizedSuperAdmin() — this
// codebase doesn't share these across files. Reads the authoritative
// app_metadata role via getUserRole(), never a client-supplied value.
async function getAuthorizedSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (getUserRole(user) !== "SUPER_ADMIN") return null;
  return user;
}

export interface IssueListRow {
  id: string;
  volumeNumber: number;
  issueNumber: number;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  publishedManuscriptCount: number;
}

// publishedManuscriptCount only counts manuscripts that are BOTH assigned to
// this issue AND currently status = PUBLISHED — an issue's manuscript could
// in principle be un-published later (not a flow this app has today, but
// nothing prevents it structurally), and this list must never suggest more
// public content exists than actually does.
export async function getIssuesAction(): Promise<IssueListRow[]> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) return [];

  const issues = await db.issue.findMany({
    orderBy: [{ volume_number: "desc" }, { issue_number: "desc" }],
    include: { _count: { select: { manuscripts: { where: { status: "PUBLISHED" } } } } },
  });

  return issues.map((issue) => ({
    id: issue.id,
    volumeNumber: issue.volume_number,
    issueNumber: issue.issue_number,
    publishedAt: issue.published_at,
    createdAt: issue.created_at,
    updatedAt: issue.updated_at,
    publishedManuscriptCount: issue._count.manuscripts,
  }));
}

export interface IssueManuscriptRow {
  id: string;
  manuscriptCode: string;
  title: string;
  primaryAuthorName: string;
  // Phase 6.6: manuscript.published_at, not updated_at (issue assignment
  // itself writes to this same row and would otherwise corrupt the date
  // shown here) — null for a manuscript published before this field existed.
  publishedAt: Date | null;
}

export interface IssueDetail {
  id: string;
  volumeNumber: number;
  issueNumber: number;
  publishedAt: Date | null;
  assignedManuscripts: IssueManuscriptRow[];
  // PUBLISHED manuscripts not currently assigned to ANY issue — a
  // manuscript belongs to zero or one issue, so "available" excludes
  // manuscripts already sitting on a different issue too, not just this one.
  availableManuscripts: IssueManuscriptRow[];
}

async function toManuscriptRow(
  m: { id: string; title: string; created_at: Date; primary_author_id: string; published_at: Date | null },
  nameById: Map<string, string>
): Promise<IssueManuscriptRow> {
  return {
    id: m.id,
    manuscriptCode: getManuscriptCode(m.id, m.created_at),
    title: m.title,
    primaryAuthorName: nameById.get(m.primary_author_id) ?? "Unknown",
    publishedAt: m.published_at,
  };
}

export async function getIssueDetailAction(issueId: string): Promise<IssueDetail | null> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) return null;

  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue) return null;

  const [assigned, available] = await Promise.all([
    db.manuscript.findMany({
      where: { issue_id: issueId, status: "PUBLISHED" },
      select: { id: true, title: true, created_at: true, primary_author_id: true, published_at: true },
      orderBy: [{ published_at: { sort: "desc", nulls: "last" } }, { updated_at: "desc" }],
    }),
    db.manuscript.findMany({
      where: { issue_id: null, status: "PUBLISHED" },
      select: { id: true, title: true, created_at: true, primary_author_id: true, published_at: true },
      orderBy: [{ published_at: { sort: "desc", nulls: "last" } }, { updated_at: "desc" }],
    }),
  ]);

  const authorIds = [...new Set([...assigned, ...available].map((m) => m.primary_author_id))];
  const authors = await db.user.findMany({ where: { id: { in: authorIds } }, select: { id: true, full_name: true } });
  const nameById = new Map(authors.map((a) => [a.id, a.full_name]));

  return {
    id: issue.id,
    volumeNumber: issue.volume_number,
    issueNumber: issue.issue_number,
    publishedAt: issue.published_at,
    assignedManuscripts: await Promise.all(assigned.map((m) => toManuscriptRow(m, nameById))),
    availableManuscripts: await Promise.all(available.map((m) => toManuscriptRow(m, nameById))),
  };
}

function validateVolumeIssueNumbers(volumeNumber: number, issueNumber: number): string | null {
  if (!Number.isInteger(volumeNumber) || volumeNumber < 1 || volumeNumber > 9999) {
    return "Volume number must be a whole number between 1 and 9999.";
  }
  if (!Number.isInteger(issueNumber) || issueNumber < 1 || issueNumber > 9999) {
    return "Issue number must be a whole number between 1 and 9999.";
  }
  return null;
}

function parsePublishedAt(raw: string | null | undefined): { ok: true; value: Date | null } | { ok: false; error: string } {
  if (!raw) return { ok: true, value: null };
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { ok: false, error: "Publication date is not a valid date." };
  return { ok: true, value: parsed };
}

// Postgres unique_violation — thrown by the volume_number+issue_number
// unique index (issues_volume_number_issue_number_key) added in this
// phase's migration. Relying on the real DB constraint here rather than a
// separate findFirst-then-create check avoids a TOCTOU race between two
// concurrent creates for the same volume/issue.
function isUniqueViolation(err: unknown): boolean {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function createIssueAction({
  volumeNumber,
  issueNumber,
  publishedAt,
}: {
  volumeNumber: number;
  issueNumber: number;
  publishedAt?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) {
    return { success: false, errors: { _form: ["You must be signed in as a Super Admin."] } };
  }

  const numberError = validateVolumeIssueNumbers(volumeNumber, issueNumber);
  if (numberError) return { success: false, errors: { _form: [numberError] } };

  const dateResult = parsePublishedAt(publishedAt);
  if (!dateResult.ok) return { success: false, errors: { _form: [dateResult.error] } };

  let created;
  try {
    created = await db.issue.create({
      data: { volume_number: volumeNumber, issue_number: issueNumber, published_at: dateResult.value },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: false, errors: { _form: [`Volume ${volumeNumber}, Issue ${issueNumber} already exists.`] } };
    }
    throw err;
  }

  await logAuditEvent({
    userId: admin.id,
    action: "issue.created",
    resourceId: created.id,
    metadata: { volumeNumber, issueNumber },
  });

  revalidatePath("/control-center/issues");
  revalidatePath("/volumes-and-issues");
  return { success: true, data: { id: created.id } };
}

export async function updateIssueAction({
  issueId,
  volumeNumber,
  issueNumber,
  publishedAt,
}: {
  issueId: string;
  volumeNumber: number;
  issueNumber: number;
  publishedAt?: string | null;
}): Promise<ActionResult> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) {
    return { success: false, errors: { _form: ["You must be signed in as a Super Admin."] } };
  }

  const existing = await db.issue.findUnique({ where: { id: issueId } });
  if (!existing) {
    return { success: false, errors: { _form: ["Issue not found."] } };
  }

  const numberError = validateVolumeIssueNumbers(volumeNumber, issueNumber);
  if (numberError) return { success: false, errors: { _form: [numberError] } };

  const dateResult = parsePublishedAt(publishedAt);
  if (!dateResult.ok) return { success: false, errors: { _form: [dateResult.error] } };

  try {
    await db.issue.update({
      where: { id: issueId },
      data: { volume_number: volumeNumber, issue_number: issueNumber, published_at: dateResult.value },
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      return { success: false, errors: { _form: [`Volume ${volumeNumber}, Issue ${issueNumber} already exists.`] } };
    }
    throw err;
  }

  await logAuditEvent({
    userId: admin.id,
    action: "issue.updated",
    resourceId: issueId,
    metadata: { volumeNumber, issueNumber },
  });

  revalidatePath("/control-center/issues");
  revalidatePath(`/control-center/issues/${issueId}`);
  revalidatePath("/volumes-and-issues");
  return { success: true };
}

export async function assignManuscriptToIssueAction({
  issueId,
  manuscriptId,
}: {
  issueId: string;
  manuscriptId: string;
}): Promise<ActionResult> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) {
    return { success: false, errors: { _form: ["You must be signed in as a Super Admin."] } };
  }

  const issue = await db.issue.findUnique({ where: { id: issueId } });
  if (!issue) {
    return { success: false, errors: { _form: ["Issue not found."] } };
  }

  const manuscript = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!manuscript) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
  }
  // The one rule this action exists to enforce, server-side: only a
  // manuscript that has actually cleared the state machine and reached
  // PUBLISHED may ever be attached to an issue. An issue_id on anything
  // else would be meaningless (the public archive only ever reads
  // status = PUBLISHED manuscripts regardless — see
  // src/app/(public)/volumes-and-issues/page.tsx) but rejecting it here
  // keeps the admin UI's own data honest too.
  if (manuscript.status !== "PUBLISHED") {
    return { success: false, errors: { _form: ["Only published manuscripts can be assigned to an issue."] } };
  }

  await db.manuscript.update({ where: { id: manuscriptId }, data: { issue_id: issueId } });

  await logAuditEvent({
    userId: admin.id,
    action: "issue.manuscript_assigned",
    resourceId: manuscriptId,
    metadata: { issueId, volumeNumber: issue.volume_number, issueNumber: issue.issue_number },
  });

  updateTag(`issue-${issueId}`);
  revalidatePath(`/control-center/issues/${issueId}`);
  revalidatePath("/control-center/issues");
  revalidatePath("/volumes-and-issues");
  return { success: true };
}

export async function removeManuscriptFromIssueAction({
  manuscriptId,
}: {
  manuscriptId: string;
}): Promise<ActionResult> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) {
    return { success: false, errors: { _form: ["You must be signed in as a Super Admin."] } };
  }

  const manuscript = await db.manuscript.findUnique({ where: { id: manuscriptId } });
  if (!manuscript) {
    return { success: false, errors: { _form: ["Manuscript not found."] } };
  }
  const previousIssueId = manuscript.issue_id;

  // Purely a grouping change — the manuscript's own status/lifecycle is
  // untouched, matching the task's explicit requirement that removing an
  // issue assignment must never affect manuscript status.
  await db.manuscript.update({ where: { id: manuscriptId }, data: { issue_id: null } });

  await logAuditEvent({
    userId: admin.id,
    action: "issue.manuscript_removed",
    resourceId: manuscriptId,
    metadata: { previousIssueId },
  });

  if (previousIssueId) {
    updateTag(`issue-${previousIssueId}`);
    revalidatePath(`/control-center/issues/${previousIssueId}`);
  }
  revalidatePath("/control-center/issues");
  revalidatePath("/volumes-and-issues");
  return { success: true };
}
