import Link from "next/link";
import type { ResearchPaper } from "@/types/manuscript";

export default function ResearchGrid({ papers }: { papers: ResearchPaper[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {papers.map((paper) => (
        <div key={paper.id} className="card-terminal group">
          <h3 className="heading-display text-xl mb-2 leading-tight">
            <Link href={`/article/${paper.id}`} className="hover:text-primary transition-none">
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
            <Link href={`/article/${paper.id}`} className="inline-flex items-center text-accent hover:bg-accent hover:text-white px-2 py-1 transition-none uppercase tracking-widest border border-transparent hover:border-accent">
              [ READ ]
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
