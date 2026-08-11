import { notFound } from "next/navigation";
import SplitScreenWorkspace from "@/components/editor/SplitScreenWorkspace";
import { getManuscriptForReview, acquireReviewLockAction } from "@/lib/actions/editorial";

export default async function ReviewWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Attempt to claim the soft lock before reading state, so the subsequent
  // read reflects whichever editor actually holds it now.
  await acquireReviewLockAction({ manuscriptId: id });
  const data = await getManuscriptForReview(id);

  if (!data) {
    notFound();
  }

  const { manuscript } = data;

  return (
    <SplitScreenWorkspace
      manuscriptId={manuscript.id}
      manuscriptCode={data.manuscriptCode}
      title={manuscript.title}
      abstract={manuscript.abstract}
      keywords={manuscript.keywords}
      references={Array.isArray(manuscript.references) ? (manuscript.references as string[]) : []}
      hasFile={manuscript.file_url != null}
      status={manuscript.status}
      primaryAuthor={data.primaryAuthor}
      initialDraft={data.draftReview}
      lockedBySomeoneElse={data.lock.heldBySomeoneElse}
      lockHolderName={data.lock.holderName}
    />
  );
}
