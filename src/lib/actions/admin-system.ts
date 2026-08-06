"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import { getJournalSettings } from "@/lib/journal-settings";
import { logAuditEvent } from "@/lib/audit/logger";
import type { UserRole } from "@/generated/prisma/client";
import type { ActionResult } from "./submission";

async function getAuthorizedSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  if (getUserRole(user) !== "SUPER_ADMIN") return null;
  return user;
}

const ACTIVE_STATUSES = ["SUBMITTED", "UNDER_REVIEW", "REVISION_REQUIRED", "RESUBMITTED"] as const;

export interface PlatformMetrics {
  totalManuscripts: number;
  activeSubmissions: number;
  publishedPapers: number;
  totalUsers: number;
  filesAttached: number;
  registrationsLast24h: number;
  registrationsLast7d: number;
  submissionsLast7d: number;
}

// "Database & Storage Usage" is scoped honestly: filesAttached is a real row
// count (manuscripts with a file_url set). Byte-level storage consumption
// isn't available — file size was never persisted (see FileUpload.tsx /
// upload.ts), and there's no R2 API wired up to ask the bucket directly.
// Faking a number here would be worse than not showing one.
export async function getPlatformMetricsAction(): Promise<PlatformMetrics | null> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) return null;

  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    totalManuscripts,
    activeSubmissions,
    publishedPapers,
    totalUsers,
    filesAttached,
    registrationsLast24h,
    registrationsLast7d,
    submissionsLast7d,
  ] = await Promise.all([
    db.manuscript.count(),
    db.manuscript.count({ where: { status: { in: [...ACTIVE_STATUSES] } } }),
    db.manuscript.count({ where: { status: "PUBLISHED" } }),
    db.user.count(),
    db.manuscript.count({ where: { file_url: { not: null } } }),
    db.user.count({ where: { created_at: { gte: oneDayAgo } } }),
    db.user.count({ where: { created_at: { gte: sevenDaysAgo } } }),
    db.manuscriptAuditLog.count({ where: { to_state: "SUBMITTED", created_at: { gte: sevenDaysAgo } } }),
  ]);

  return {
    totalManuscripts,
    activeSubmissions,
    publishedPapers,
    totalUsers,
    filesAttached,
    registrationsLast24h,
    registrationsLast7d,
    submissionsLast7d,
  };
}

export interface UserRow {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  manuscriptCount: number;
  createdAt: Date;
}

export interface UsersPage {
  rows: UserRow[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function getUsersPageAction({
  page = 1,
  limit = 10,
  search,
}: {
  page?: number;
  limit?: number;
  search?: string;
} = {}): Promise<UsersPage> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) return { rows: [], totalCount: 0, page: 1, limit, totalPages: 0 };

  const safePage = Math.max(1, Math.floor(page) || 1);
  const where = search
    ? {
        OR: [
          { full_name: { contains: search, mode: "insensitive" as const } },
          { email: { contains: search, mode: "insensitive" as const } },
        ],
      }
    : {};

  const totalCount = await db.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / limit));
  const effectivePage = Math.min(safePage, totalPages);

  const users = await db.user.findMany({
    where,
    orderBy: { created_at: "desc" },
    skip: (effectivePage - 1) * limit,
    take: limit,
  });

  const manuscriptCounts = await db.manuscript.groupBy({
    by: ["primary_author_id"],
    _count: true,
    where: { primary_author_id: { in: users.map((u) => u.id) } },
  });
  const countByUser = new Map(manuscriptCounts.map((c) => [c.primary_author_id, c._count]));

  return {
    rows: users.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      role: u.role,
      emailVerified: u.email_verified,
      manuscriptCount: countByUser.get(u.id) ?? 0,
      createdAt: u.created_at,
    })),
    totalCount,
    page: effectivePage,
    limit,
    totalPages,
  };
}

export async function updateUserRoleAction({
  userId,
  newRole,
}: {
  userId: string;
  newRole: UserRole;
}): Promise<ActionResult> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) {
    return { success: false, errors: { _form: ["You must be signed in as a super admin."] } };
  }

  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) {
    return { success: false, errors: { _form: ["User not found."] } };
  }
  if (target.role === newRole) {
    return { success: true };
  }
  // A super admin demoting themselves would strand the platform with no
  // SUPER_ADMIN able to undo it (there's no separate ops/root access here).
  if (target.id === admin.id && newRole !== "SUPER_ADMIN") {
    return { success: false, errors: { _form: ["You can't change your own role away from SUPER_ADMIN."] } };
  }

  await db.$transaction([
    db.user.update({ where: { id: userId }, data: { role: newRole } }),
    db.userRoleAuditLog.create({
      data: {
        target_user_id: userId,
        previous_role: target.role,
        new_role: newRole,
        changed_by_id: admin.id,
      },
    }),
    // public.users.role above is a denormalized display copy — every actual
    // RBAC check (getUserRole in src/lib/auth/rbac.ts) reads the role out of
    // the Supabase Auth session's user_metadata instead. There's no service
    // role key configured to go through Supabase's Admin API
    // (auth.admin.updateUserById), so this updates auth.users directly over
    // the same Postgres connection — the only path available without that
    // key. $executeRaw parametrizes both values; no injection surface.
    db.$executeRaw`update auth.users set raw_user_meta_data = raw_user_meta_data || jsonb_build_object('role', ${newRole}::text) where id = ${userId}::uuid`,
  ]);

  await logAuditEvent({
    userId: admin.id,
    action: "user.role_changed",
    resourceId: userId,
    metadata: { previousRole: target.role, newRole },
  });

  revalidatePath("/control-center/users");
  return { success: true };
}

export interface RoleAuditEntry {
  previousRole: UserRole;
  newRole: UserRole;
  changedByName: string;
  createdAt: Date;
}

export async function getUserRoleAuditTrailAction(userId: string): Promise<RoleAuditEntry[]> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) return [];

  const entries = await db.userRoleAuditLog.findMany({
    where: { target_user_id: userId },
    orderBy: { created_at: "desc" },
  });
  const changerIds = [...new Set(entries.map((e) => e.changed_by_id))];
  const changers = await db.user.findMany({ where: { id: { in: changerIds } } });
  const nameById = new Map(changers.map((c) => [c.id, c.full_name]));

  return entries.map((e) => ({
    previousRole: e.previous_role,
    newRole: e.new_role,
    changedByName: nameById.get(e.changed_by_id) ?? "Unknown",
    createdAt: e.created_at,
  }));
}

export interface JournalSettingsData {
  journalTitle: string;
  issn: string;
  contactEmail: string;
  publisherName: string;
  abstractWordLimit: number;
  staleReviewThresholdDays: number;
}

export async function getJournalSettingsAction(): Promise<JournalSettingsData | null> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) return null;

  const settings = await getJournalSettings();

  return {
    journalTitle: settings.journal_title,
    issn: settings.issn,
    contactEmail: settings.contact_email,
    publisherName: settings.publisher_name,
    abstractWordLimit: settings.abstract_word_limit,
    staleReviewThresholdDays: settings.stale_review_threshold_days,
  };
}

export async function updateJournalSettingsAction(data: JournalSettingsData): Promise<ActionResult> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) {
    return { success: false, errors: { _form: ["You must be signed in as a super admin."] } };
  }

  if (data.abstractWordLimit < 50 || data.abstractWordLimit > 2000) {
    return { success: false, errors: { abstractWordLimit: ["Must be between 50 and 2000 words."] } };
  }
  if (data.staleReviewThresholdDays < 1 || data.staleReviewThresholdDays > 90) {
    return { success: false, errors: { staleReviewThresholdDays: ["Must be between 1 and 90 days."] } };
  }

  await db.journalSettings.upsert({
    where: { id: "singleton" },
    update: {
      journal_title: data.journalTitle,
      issn: data.issn,
      contact_email: data.contactEmail,
      publisher_name: data.publisherName,
      abstract_word_limit: data.abstractWordLimit,
      stale_review_threshold_days: data.staleReviewThresholdDays,
    },
    create: {
      id: "singleton",
      journal_title: data.journalTitle,
      issn: data.issn,
      contact_email: data.contactEmail,
      publisher_name: data.publisherName,
      abstract_word_limit: data.abstractWordLimit,
      stale_review_threshold_days: data.staleReviewThresholdDays,
    },
  });

  revalidatePath("/control-center/settings");
  return { success: true };
}

export interface CategorySettingRow {
  key: string;
  label: string;
  enabled: boolean;
}

export async function getCategorySettingsAction(): Promise<CategorySettingRow[]> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) return [];

  // Imported lazily to avoid a hard module-eval-time dependency cycle risk;
  // SUBJECT_CATEGORY_LABELS is a plain const object either way.
  const { SUBJECT_CATEGORIES, SUBJECT_CATEGORY_LABELS } = await import("@/lib/validations/submission");

  const settings = await db.categorySetting.findMany();
  const enabledByKey = new Map(settings.map((s) => [s.key, s.enabled]));

  return SUBJECT_CATEGORIES.map((key) => ({
    key,
    label: SUBJECT_CATEGORY_LABELS[key],
    enabled: enabledByKey.get(key) ?? true,
  }));
}

export async function toggleCategoryEnabledAction({
  key,
  enabled,
}: {
  key: string;
  enabled: boolean;
}): Promise<ActionResult> {
  const admin = await getAuthorizedSuperAdmin();
  if (!admin) {
    return { success: false, errors: { _form: ["You must be signed in as a super admin."] } };
  }

  await db.categorySetting.upsert({
    where: { key },
    update: { enabled },
    create: { key, enabled },
  });

  revalidatePath("/control-center/settings");
  return { success: true };
}
