import { notFound } from "next/navigation";
import SubmissionForm from "@/components/SubmissionForm";
import ManuscriptStatusTracker from "@/components/ManuscriptStatusTracker";
import { getSubmission } from "@/lib/actions/submission";
import { SUBJECT_CATEGORIES, type DraftFormValues } from "@/lib/validations/submission";
import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/rbac";

export default async function EditSubmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const manuscript = await getSubmission(id);

  if (!manuscript) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? getUserRole(user) : "RESEARCHER";

  const category = SUBJECT_CATEGORIES.find((c) => c === manuscript.subject_category);

  const initialData: Partial<DraftFormValues> = {
    title: manuscript.title,
    abstract: manuscript.abstract,
    keywords: manuscript.keywords,
    authors: Array.isArray(manuscript.co_authors) ? (manuscript.co_authors as DraftFormValues["authors"]) : [],
    category,
    references: Array.isArray(manuscript.references) ? (manuscript.references as string[]) : [],
  };

  const initialFile = manuscript.file_url
    ? {
        fileUrl: manuscript.file_url,
        fileHash: manuscript.file_hash ?? "",
        isSITConference: manuscript.sit_conference_flag,
      }
    : null;

  return (
    <div className="flex flex-col">
      <div className="max-w-3xl mx-auto w-full px-4 pt-10">
        <ManuscriptStatusTracker
          manuscriptId={manuscript.id}
          status={manuscript.status}
          role={role as "RESEARCHER" | "ADMIN" | "SUPER_ADMIN"}
          isOwner={manuscript.isOwner}
        />
      </div>
      <SubmissionForm
        manuscriptId={manuscript.id}
        initialData={initialData}
        initialFile={initialFile}
        status={manuscript.status}
        isOwner={manuscript.isOwner}
      />
    </div>
  );
}
