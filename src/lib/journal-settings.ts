import "server-only";
import { db } from "@/lib/db";

// Unguarded on purpose — these are config values every submitter/editor
// needs to respect (abstract word limit, stale-review threshold), not
// sensitive data. The SUPER_ADMIN-only edit form lives in
// src/lib/actions/admin-system.ts; this is the read path shared by it and
// by ordinary submission/editorial code.
export async function getJournalSettings() {
  return db.journalSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

// Categories with no row yet default to enabled — a category is only
// unavailable once a SUPER_ADMIN explicitly disables it (see
// control-center/settings and src/lib/actions/admin-system.ts).
export async function getEnabledCategoryKeys(): Promise<Set<string>> {
  const { SUBJECT_CATEGORIES } = await import("@/lib/validations/submission");
  const settings = await db.categorySetting.findMany();
  const disabledKeys = new Set(settings.filter((s) => !s.enabled).map((s) => s.key));
  return new Set(SUBJECT_CATEGORIES.filter((key) => !disabledKeys.has(key)));
}
