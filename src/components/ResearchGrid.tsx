import Link from "next/link";

interface ResearchPaper {
  id: string;
  title: string;
  author: string;
  abstract: string;
  date: string;
}

export default function ResearchGrid({ papers }: { papers: ResearchPaper[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {papers.map((paper) => (
        <div key={paper.id} className="card-terminal group">
          <h3 className="heading-display text-xl mb-2 leading-tight">
            <Link href={`/article/${paper.id}`} className="hover:text-[#38BDF8] transition-none">
              {paper.title}
            </Link>
          </h3>
          <p className="font-mono text-[#EAB308] text-xs uppercase tracking-widest mb-3">{paper.author}</p>
          <p className="text-[#F8FAFC] opacity-80 text-sm mb-5 line-clamp-3 leading-relaxed">
            {paper.abstract}
          </p>
          <div className="flex justify-between items-center text-xs font-mono mt-auto border-t border-[#30363D] pt-4">
            <span className="text-[#38BDF8] border border-[#30363D] px-2 py-1 bg-[#0D1117]">
              DAT: {paper.date}
            </span>
            <Link href={`/article/${paper.id}`} className="inline-flex items-center text-[#EAB308] hover:bg-[#EAB308] hover:text-black px-2 py-1 transition-none uppercase tracking-widest border border-transparent hover:border-black">
              [ READ ]
            </Link>
          </div>
        </div>
      ))}
    </div>
  );
}
