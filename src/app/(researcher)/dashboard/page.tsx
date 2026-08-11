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
  const coAuthored = data.coAuthored.map((m) => ({ ...m, file_url: null }));

  return (
    <WorkspaceDashboard
      email={data.email}
      fullName={data.fullName}
      institutionalAffiliation={data.institutionalAffiliation}
      own={data.own}
      coAuthored={coAuthored}
      paymentsByManuscriptId={data.paymentsByManuscriptId}
    />
  );
}
