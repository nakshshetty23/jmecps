import Sidebar from "@/components/shared/Sidebar";
import { Metadata } from "next";
import Link from "next/link";
import { getPublicIssues, getPublishedManuscriptsForIssue, type PublicIssueSummary } from "@/lib/search/manuscripts";

export const metadata: Metadata = {
  title: "Volumes and Issues | JMECPS",
  description: "Archive of previously published research in JMECPS.",
};

// Real data as of Phase 6.4: getPublicIssues() only returns issues a
// SUPER_ADMIN has actually set a publication date on (see that function's
// comment in src/lib/search/manuscripts.ts) — an issue existing/having
// manuscripts assigned is not by itself enough to appear here. Each
// issue's manuscript list is independently re-filtered to
// status = PUBLISHED, so even a manuscript still carrying an issue_id from
// before it was, say, withdrawn can never surface publicly.
function formatDate(date: Date | null): string {
  if (!date) return "Publication date unavailable";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

async function IssueSection({ issue }: { issue: PublicIssueSummary }) {
  const manuscripts = await getPublishedManuscriptsForIssue(issue.id);

  return (
    <div className="card-terminal">
      <h2 className="heading-display text-2xl text-text mb-1">
        Volume {issue.volumeNumber} — <span className="text-primary">Issue {issue.issueNumber}</span>
      </h2>
      <p className="font-mono text-xs text-text opacity-70 mb-4 uppercase tracking-widest">
        Published: {formatDate(issue.publishedAt)}
      </p>
      {manuscripts.length === 0 ? (
        <p className="text-sm text-text opacity-70">No published manuscripts are assigned to this issue yet.</p>
      ) : (
        <ul className="flex flex-col gap-4">
          {manuscripts.map((m) => (
            <li key={m.id} className="flex gap-2 border-t border-border pt-4 first:border-0 first:pt-0">
              <span className="text-primary" aria-hidden="true">•</span>
              <div className="flex flex-col gap-0.5 min-w-0">
                <Link href={`/articles/${m.id}`} className="text-text hover:text-primary font-medium transition-none break-words">
                  {m.title}
                </Link>
                <p className="font-mono text-xs text-accent uppercase tracking-widest">
                  {m.authors.length > 0 ? m.authors.map((a) => a.fullName).join(", ") : (m.correspondingAuthorName ?? "Unknown")}
                </p>
                <p className="font-mono text-xs text-text opacity-60">
                  {m.publishedAt ? `Published ${formatDate(m.publishedAt)}` : "Publication date unavailable"}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function Archive() {
  const issues = await getPublicIssues();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-border text-accent">
            [ VOLUMES AND ISSUES ]
          </h1>
          {issues.length === 0 ? (
            <div className="card-terminal">
              <p className="font-mono text-sm text-text opacity-80 leading-relaxed">
                No issues have been published yet.
              </p>
              <div className="mt-6">
                <Link href="/search" className="btn-primary inline-block">
                  Browse Published Papers
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {issues.map((issue) => (
                <IssueSection key={issue.id} issue={issue} />
              ))}
            </div>
          )}
        </div>
        <div className="w-full lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
