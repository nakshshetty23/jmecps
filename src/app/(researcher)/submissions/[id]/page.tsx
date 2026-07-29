import { notFound } from "next/navigation";
import SubmissionForm from "@/components/SubmissionForm";
import { getSubmission } from "@/lib/actions/submission";
import { SUBJECT_CATEGORIES, type DraftFormValues } from "@/lib/validations/submission";

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
    <SubmissionForm
      manuscriptId={manuscript.id}
      initialData={initialData}
      initialFile={initialFile}
      readOnly={manuscript.status !== "DRAFT"}
    />
  );
}
