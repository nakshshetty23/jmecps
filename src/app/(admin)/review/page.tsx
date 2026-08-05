import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import EditorialQueueTable from "@/components/editor/EditorialQueueTable";
import TriageFilterBar from "@/components/editor/TriageFilterBar";
import PaginationControls from "@/components/editor/PaginationControls";
import {
  getAdminTriageQueueAction,
  getTriageSummaryAction,
  getAvailableEditorsAction,
} from "@/lib/actions/editorial";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/rbac";
import type { ManuscriptStatus } from "@/generated/prisma/client";

export default async function AdminReviewQueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = params.page ? parseInt(params.page, 10) : 1;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? getUserRole(user) : "ADMIN";

  const [{ rows, totalCount, totalPages, page: effectivePage }, summary, availableEditors] = await Promise.all([
    getAdminTriageQueueAction({
      page,
      status: params.status as ManuscriptStatus | undefined,
      track: params.track as "SIT_CONF" | "STANDARD" | undefined,
      category: params.category,
      search: params.search,
    }),
    getTriageSummaryAction(),
    getAvailableEditorsAction(),
  ]);

  const triageTiles = [
    { label: "New Unassigned", value: summary.newUnassigned },
    { label: "In Peer Review", value: summary.inPeerReview },
    { label: "Awaiting Revision", value: summary.awaitingRevision },
    { label: "Awaiting Payment", value: summary.awaitingPayment },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 flex flex-col gap-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {triageTiles.map((tile) => (
          <div key={tile.label} className="card-terminal flex flex-col gap-1">
            <span className="font-mono text-2xl text-primary">{tile.value}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">{tile.label}</span>
          </div>
        ))}
      </div>

      {summary.staleUnassignedCount > 0 && (
        <div className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-400">
          <Badge variant="outline" className="mr-2 border-amber-500/40 text-amber-400">
            High Priority
          </Badge>
          {summary.staleUnassignedCount} submission{summary.staleUnassignedCount === 1 ? "" : "s"} unassigned for
          more than 5 days.
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="heading-display text-2xl text-primary">Editorial Review Queue</CardTitle>
          <CardDescription>Submitted manuscripts awaiting a decision, oldest first.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TriageFilterBar />
          <EditorialQueueTable
            rows={rows}
            availableEditors={availableEditors}
            canOverrideState={role === "SUPER_ADMIN"}
          />
          <PaginationControls page={effectivePage} totalPages={totalPages} searchParams={params} />
          <p className="text-xs text-muted-foreground">{totalCount} total in queue.</p>
        </CardContent>
      </Card>
    </div>
  );
}
