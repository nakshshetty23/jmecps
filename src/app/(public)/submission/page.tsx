import Sidebar from "@/components/shared/Sidebar";
import LegacySubmissionDemoForm from "@/components/LegacySubmissionDemoForm";

export default function Submission() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-border text-accent">
            [ AUTHOR PORTAL: SUBMIT MANUSCRIPT ]
          </h1>

          <LegacySubmissionDemoForm />
        </div>
        <div className="w-full lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
