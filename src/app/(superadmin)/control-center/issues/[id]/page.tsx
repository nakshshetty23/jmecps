import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import EditIssueForm from "@/components/admin/EditIssueForm";
import IssueManuscriptAssignments from "@/components/admin/IssueManuscriptAssignments";
import { getIssueDetailAction } from "@/lib/actions/issues";

export default async function IssueDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const issue = await getIssueDetailAction(id);
  if (!issue) notFound();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">
            Volume {issue.volumeNumber}, Issue {issue.issueNumber}
          </CardTitle>
          <CardDescription>Edit issue metadata and manage which published manuscripts belong to it.</CardDescription>
        </CardHeader>
        <CardContent>
          <EditIssueForm
            issueId={issue.id}
            volumeNumber={issue.volumeNumber}
            issueNumber={issue.issueNumber}
            publishedAt={issue.publishedAt}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Manuscripts</CardTitle>
        </CardHeader>
        <CardContent>
          <IssueManuscriptAssignments
            issueId={issue.id}
            assignedManuscripts={issue.assignedManuscripts}
            availableManuscripts={issue.availableManuscripts}
          />
        </CardContent>
      </Card>
    </div>
  );
}
