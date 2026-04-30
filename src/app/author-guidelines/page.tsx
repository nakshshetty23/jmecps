import Sidebar from "@/components/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Author Guidelines | JMECPS",
  description: "Guidelines and requirements for submitting manuscripts to the Journal of Mechanical, Electronics and Cyber Physical System.",
};

const guidelines = [
  { 
    title: "Manuscript Template", 
    detail: "Submissions must be formatted using the official journal template (Word format).",
    icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
  },
  { 
    title: "Paper Length", 
    detail: "Manuscripts should be of an appropriate length, providing a comprehensive yet concise overview of the research.",
    icon: "M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
  },
  { 
    title: "Abstract", 
    detail: "Provide a clear, structured, and engaging abstract of exactly 150–250 words.",
    icon: "M4 6h16M4 12h16M4 18h7"
  },
  { 
    title: "Keywords", 
    detail: "Provide a maximum of 5 highly relevant keywords beneath the abstract for accurate indexing.",
    icon: "M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
  },
  { 
    title: "References", 
    detail: "All citations and references must be strictly formatted in IEEE, APA, or Vancouver style.",
    icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
  },
  { 
    title: "Figures & Images", 
    detail: "All included figures, charts, and diagrams must be provided in high resolution and be clearly legible.",
    icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
  },
  { 
    title: "Similarity Limit", 
    detail: "The overall similarity index must be strictly below the journal's acceptable limit as checked by plagiarism tools.",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
  },
  { 
    title: "Originality", 
    detail: "Submissions must be strictly original, unpublished work that is not under consideration elsewhere.",
    icon: "M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
  }
];

export default function AuthorGuidelines() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-[#30363D] text-[#EAB308]">
            [ AUTHOR GUIDELINES ]
          </h1>
          
          <div className="card-terminal mb-8">
            <p className="text-[1.05rem] text-[#F8FAFC] opacity-80 leading-relaxed text-justify mb-6">
              Thank you for considering the Journal of Mechanical, Electronics and Cyber Physical System (JMECPS) for your research publication. To ensure a smooth and efficient review process, we request all prospective authors to strictly adhere to the following manuscript preparation guidelines before submission.
            </p>
            
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
              {guidelines.map((item, index) => (
                <div key={index} className="flex flex-col p-6 bg-[#0D1117] border border-[#30363D] hover:border-[#38BDF8] transition-none group">
                  <div className="flex items-center gap-4 mb-3 border-b border-[#30363D] pb-3">
                    <div className="flex-shrink-0 w-8 h-8 border border-[#38BDF8] text-[#38BDF8] flex items-center justify-center group-hover:bg-[#38BDF8] group-hover:text-black transition-none">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d={item.icon} />
                      </svg>
                    </div>
                    <h3 className="heading-display text-lg text-[#F8FAFC]">
                      {item.title}
                    </h3>
                  </div>
                  <p className="text-sm text-[#F8FAFC] opacity-80 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
              ))}
            </div>

            <div className="mt-10 p-6 bg-[#161B22] border-t-2 border-[#EAB308] text-center border-l border-r border-b border-x-[#30363D] border-b-[#30363D]">
              <p className="font-mono text-[#F8FAFC] mb-4 uppercase tracking-widest text-sm">SYS_READY: Proceed to manuscript upload</p>
              <a href="/submission" className="btn-primary inline-block">
                INITIATE_SUBMISSION
              </a>
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
