import { redirect } from "next/navigation";
import { getDashboardData } from "@/lib/actions/dashboard";
import WorkspaceDashboard from "@/components/dashboard/WorkspaceDashboard";

export default async function DashboardPage() {
  const data = await getDashboardData();
  if (!data) redirect("/login");

  return (
    <WorkspaceDashboard
      email={data.email}
      fullName={data.fullName}
      institutionalAffiliation={data.institutionalAffiliation}
      own={data.own}
      coAuthored={data.coAuthored}
      paymentsByManuscriptId={data.paymentsByManuscriptId}
    />
  );
}
