import Link from "next/link";
import type { IssueListRow } from "@/lib/actions/issues";

export default function IssueTable({ rows }: { rows: IssueListRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card px-3 py-12 text-center">
        <p className="text-sm text-muted-foreground">No issues have been created yet.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-card text-left font-mono text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-3 py-2">Volume</th>
            <th className="px-3 py-2">Issue</th>
            <th className="px-3 py-2">Publication Date</th>
            <th className="px-3 py-2">Published Manuscripts</th>
            <th className="px-3 py-2">Last Updated</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border last:border-0 hover:bg-muted/20">
              <td className="px-3 py-3">{row.volumeNumber}</td>
              <td className="px-3 py-3">{row.issueNumber}</td>
              <td className="px-3 py-3 text-muted-foreground">
                {row.publishedAt ? row.publishedAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Not set"}
              </td>
              <td className="px-3 py-3">{row.publishedManuscriptCount}</td>
              <td className="px-3 py-3 text-xs text-muted-foreground">
                {row.updatedAt.toLocaleDateString("en-US")}
              </td>
              <td className="px-3 py-3">
                <Link href={`/control-center/issues/${row.id}`} className="text-accent hover:underline text-xs uppercase tracking-wide">
                  Manage →
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
