"use server";

import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";
import { getUserRole } from "@/lib/auth/rbac";
import type { Manuscript, Payment } from "@/generated/prisma/client";

export interface DashboardData {
  email: string;
  fullName: string;
  institutionalAffiliation: string;
  own: Manuscript[];
  coAuthored: Manuscript[];
  // Latest payment per manuscript id, for APC status badges — most
  // manuscripts will have none (only PAYMENT_PENDING/PAYMENT_COMPLETED ones
  // do), so this is a sparse lookup rather than a field on every row.
  paymentsByManuscriptId: Record<string, Payment>;
}

export async function getDashboardData(): Promise<DashboardData | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const role = getUserRole(user);
  if (role !== "RESEARCHER" && role !== "SUPER_ADMIN") return null;

  // full_name/institutional_affiliation live on public.users (populated at
  // signup by the handle_new_user trigger) — not on the Supabase Auth user
  // object itself, so this needs its own lookup for the Settings view.
  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { full_name: true, institutional_affiliation: true },
  });

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

  const payments = await db.payment.findMany({
    where: { manuscript_id: { in: own.map((m) => m.id) } },
    orderBy: { created_at: "desc" },
  });
  // findMany above is already newest-first, so the first occurrence per
  // manuscript id kept here is the latest payment for it.
  const paymentsByManuscriptId: Record<string, Payment> = {};
  for (const payment of payments) {
    if (!paymentsByManuscriptId[payment.manuscript_id]) {
      paymentsByManuscriptId[payment.manuscript_id] = payment;
    }
  }

  return {
    email: user.email ?? "",
    fullName: profile?.full_name ?? "",
    institutionalAffiliation: profile?.institutional_affiliation ?? "",
    own,
    coAuthored,
    paymentsByManuscriptId,
  };
}
