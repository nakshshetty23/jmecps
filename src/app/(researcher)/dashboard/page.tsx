import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/actions/dashboard";
import WorkspaceDashboard from "@/components/dashboard/WorkspaceDashboard";

export default async function DashboardPage() {
  const data = await getDashboardData();
  if (!data) redirect("/login");

  // Co-authors aren't the uploader, so they're not authorized to download
  // the file (see src/lib/actions/download.ts) — strip the raw file
  // reference here, server-side, so it never reaches the client for rows
  // where it can't legitimately be used, regardless of what the UI renders.
  //
  // review_lock_by/review_lock_at/assigned_editor_id are internal
  // editorial-workflow bookkeeping (which admin currently has a paper's
  // review open, or is assigned to it) — WorkspaceDashboard never reads
  // them, and an author has no legitimate reason to receive an editor's
  // raw user ID via their own dashboard's page data. Stripped for both
  // own and co-authored rows, not just the file-access case above.
  function stripInternalFields<T extends { review_lock_by: string | null; review_lock_at: Date | null; assigned_editor_id: string | null }>(
    m: T
  ) {
    return { ...m, review_lock_by: null, review_lock_at: null, assigned_editor_id: null };
  }
  const own = data.own.map(stripInternalFields);
  const coAuthored = data.coAuthored.map((m) => stripInternalFields({ ...m, file_url: null }));

  return (
    <WorkspaceDashboard
      email={data.email}
      fullName={data.fullName}
      institutionalAffiliation={data.institutionalAffiliation}
      own={own}
      coAuthored={coAuthored}
      paymentsByManuscriptId={data.paymentsByManuscriptId}
    />
  );
}
