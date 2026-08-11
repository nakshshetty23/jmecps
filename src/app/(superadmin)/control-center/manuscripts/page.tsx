import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import ManuscriptWorkflowTable from "@/components/admin/ManuscriptWorkflowTable";
import { getSuperAdminManuscriptWorkflowAction } from "@/lib/actions/publication";

export default async function ManuscriptWorkflowPage() {
  const rows = await getSuperAdminManuscriptWorkflowAction();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">Manuscript Workflow</CardTitle>
          <CardDescription>
            Approve or reject submissions, record payment, and publish — {rows.length} manuscript
            {rows.length === 1 ? "" : "s"} in the active workflow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ManuscriptWorkflowTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
