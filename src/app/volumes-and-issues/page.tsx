import Sidebar from "@/components/Sidebar";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Volumes and Issues | JMECPS",
  description: "Archive of previously published research in JMECPS.",
};

export default function Archive() {
  const archives = [
    { vol: 4, issue: 1, date: "March 2026" },
    { vol: 3, issue: 4, date: "December 2025" },
    { vol: 3, issue: 3, date: "September 2025" },
    { vol: 3, issue: 2, date: "June 2025" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-[#30363D] text-[#EAB308]">
            [ VOLUMES AND ISSUES ]
          </h1>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {archives.map((item, index) => (
              <div key={index} className="card-terminal group flex flex-col hover:border-[#38BDF8]">
                
                <h3 className="heading-display text-2xl text-[#F8FAFC] mb-2">
                  VOL_0{item.vol} <span className="text-[#38BDF8]">ISS_0{item.issue}</span>
                </h3>
                <p className="font-mono text-sm text-[#F8FAFC] opacity-80 mb-6 bg-[#0D1117] border border-[#30363D] inline-block px-3 py-1 uppercase tracking-widest">{item.date}</p>
                
                <div className="mt-auto pt-4 border-t border-[#30363D]">
                  <Link href="#" className="inline-flex items-center text-[#EAB308] hover:bg-[#EAB308] hover:text-black px-2 py-1 transition-none uppercase font-mono tracking-widest border border-transparent hover:border-black text-xs">
                    [ VIEW_ARTICLES ]
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-full lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
