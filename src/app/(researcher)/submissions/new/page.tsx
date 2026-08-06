import SubmissionForm from "@/components/SubmissionForm";
import { getJournalSettings, getEnabledCategoryKeys } from "@/lib/journal-settings";
import { SUBJECT_CATEGORIES } from "@/lib/validations/submission";

export default async function NewSubmissionPage() {
  const [settings, enabledKeys] = await Promise.all([getJournalSettings(), getEnabledCategoryKeys()]);
  const availableCategories = SUBJECT_CATEGORIES.filter((c) => enabledKeys.has(c));

  return (
    <SubmissionForm manuscriptId={null} wordLimit={settings.abstract_word_limit} availableCategories={availableCategories} />
  );
}
