import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import EditorialQueueTable from "@/components/editor/EditorialQueueTable";
import { getPendingQueueAction } from "@/lib/actions/editorial";

export default async function AdminReviewQueuePage() {
  const rows = await getPendingQueueAction();

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">Editorial Review Queue</CardTitle>
          <CardDescription>
            Submitted manuscripts awaiting a decision, oldest first.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EditorialQueueTable rows={rows} />
        </CardContent>
      </Card>
    </div>
  );
}
