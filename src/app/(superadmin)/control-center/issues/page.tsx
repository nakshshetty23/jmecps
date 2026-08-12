import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import CreateIssueForm from "@/components/admin/CreateIssueForm";
import IssueTable from "@/components/admin/IssueTable";
import { getIssuesAction } from "@/lib/actions/issues";

export default async function IssuesPage() {
  const issues = await getIssuesAction();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">Volumes &amp; Issues</CardTitle>
          <CardDescription>
            {issues.length} issue{issues.length === 1 ? "" : "s"} created. Manage volume/issue numbering and
            assign published manuscripts to an issue for the public archive.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <CreateIssueForm />
          <IssueTable rows={issues} />
        </CardContent>
      </Card>
    </div>
  );
}
