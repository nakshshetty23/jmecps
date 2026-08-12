import Link from "next/link";

// Deliberately narrower than src/lib/search/manuscripts.ts's SearchResultRow —
// this card only ever needs these five fields, so the homepage maps down to
// this shape rather than this component depending on the full search-result
// type (keywords/category/track/rank aren't rendered here).
export interface PublicationCardData {
  id: string;
  title: string;
  author: string;
  abstract: string;
  date: string;
}

export default function ResearchGrid({ papers }: { papers: PublicationCardData[] }) {
  if (papers.length === 0) {
    return (
      <p className="font-mono text-sm text-text opacity-70 border border-border p-6 bg-background">
        No published papers yet.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {papers.map((paper) => (
        <div key={paper.id} className="card-terminal group">
          <h3 className="heading-display text-xl mb-2 leading-tight">
            <Link href={`/articles/${paper.id}`} className="hover:text-primary transition-none">
              {paper.title}
            </Link>
          </h3>
          <p className="font-mono text-accent text-xs uppercase tracking-widest mb-3">{paper.author}</p>
          <p className="text-text opacity-80 text-sm mb-5 line-clamp-3 leading-relaxed">
            {paper.abstract}
          </p>
          <div className="flex justify-between items-center text-xs font-mono mt-auto border-t border-border pt-4">
            <span className="text-primary border border-border px-2 py-1 bg-background">
              DAT: {paper.date}
            </span>
            <Link href={`/articles/${paper.id}`} className="inline-flex items-center text-accent hover:bg-accent hover:text-white px-2 py-1 transition-none uppercase tracking-widest border border-transparent hover:border-accent">
              [ READ ]
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
