import Sidebar from "@/components/shared/Sidebar";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Volumes and Issues | JMECPS",
  description: "Archive of previously published research in JMECPS.",
};

// This journal doesn't yet have volume/issue numbering anywhere in its data
// model (no such field exists on Manuscript, JournalSettings, or any other
// table — confirmed by inspecting prisma/schema.prisma directly). The
// previous version of this page filled that gap with fabricated volume/
// issue entries and "#" links; an honest "not configured yet" state is
// correct here rather than inventing numbering that doesn't exist.
export default function Archive() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-border text-accent">
            [ VOLUMES AND ISSUES ]
          </h1>
          <div className="card-terminal">
            <p className="font-mono text-sm text-text opacity-80 leading-relaxed">
              Publication archive is being prepared. This journal has not yet configured volume/issue
              numbering for its published papers.
            </p>
            <div className="mt-6">
              <Link href="/search" className="btn-primary inline-block">
                Browse Published Papers
              </Link>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
