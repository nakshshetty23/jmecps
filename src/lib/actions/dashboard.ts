"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import type { Manuscript } from "@/generated/prisma/client";

export interface DashboardData {
  email: string;
  own: Manuscript[];
  coAuthored: Manuscript[];
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const role = getUserRole(user);
  if (role !== "RESEARCHER" && role !== "SUPER_ADMIN") return null;

  const own = await db.manuscript.findMany({
    where: { primary_author_id: user.id },
    orderBy: { created_at: "desc" },
  });

  // Co-authorship isn't tracked by a relation — co_authors is free-form JSON
  // captured at submission time — so this scans other manuscripts in memory
  // for an email match. Fine at this journal's current scale; would need a
  // real join (or a JSONB containment query) if the manuscript table grows large.
  const others = await db.manuscript.findMany({
    where: { primary_author_id: { not: user.id } },
    orderBy: { created_at: "desc" },
  });
  const email = (user.email ?? "").toLowerCase();
  const coAuthored = others.filter((manuscript) => {
    const authors = Array.isArray(manuscript.co_authors)
      ? (manuscript.co_authors as { email?: string }[])
      : [];
    return authors.some((author) => (author.email ?? "").toLowerCase() === email);
  });

  return { email: user.email ?? "", own, coAuthored };
}
