import Link from "next/link";

export default function Sidebar() {
  return (
    <aside className="w-full h-full">
      <div className="bg-[#161B22] p-8 border border-[#30363D] sticky top-24">
        <div className="mb-6 pb-6 border-b border-[#30363D]">
          <h3 className="subheading-mono mb-3 text-[#EAB308]">
            [ ABOUT JMECPS ]
          </h3>
          <p className="text-sm text-[#F8FAFC] opacity-80 leading-relaxed text-justify">
            Welcome to the Editorial Board of The Journal of Mechanical, Electronics and Cyber Physical System (JMECPS). Our editorial team consists of distinguished academicians, researchers, scientists, and industry experts dedicated to maintaining excellence, integrity, and innovation in scholarly publishing.
          </p>
        </div>

        <h3 className="subheading-mono mb-6 border-b border-[#30363D] pb-3 text-[#38BDF8]">
          [ RELATED CONTENT ]
        </h3>
        <ul className="space-y-4 font-mono text-sm">
          <li className="group flex items-center">
            <div className="w-1.5 h-1.5 bg-[#EAB308] group-hover:scale-150 transition-none mr-3"></div>
            <Link href="/volumes-and-issues" className="text-[#F8FAFC] group-hover:text-[#EAB308] transition-none uppercase">
              Latest Issue
            </Link>
          </li>
          <li className="group flex items-center">
            <div className="w-1.5 h-1.5 bg-[#38BDF8] group-hover:scale-150 transition-none mr-3"></div>
            <Link href="/submission" className="text-[#F8FAFC] group-hover:text-[#38BDF8] transition-none uppercase">
              Call for Papers
            </Link>
          </li>
          <li className="group flex items-center">
            <div className="w-1.5 h-1.5 bg-[#EAB308] group-hover:scale-150 transition-none mr-3"></div>
            <Link href="/publication-charges" className="text-[#F8FAFC] group-hover:text-[#EAB308] transition-none uppercase">
              Charges & Waiver Policy
            </Link>
          </li>
          <li className="group flex items-center">
            <div className="w-1.5 h-1.5 bg-[#38BDF8] group-hover:scale-150 transition-none mr-3"></div>
            <Link href="/subjects-covered" className="text-[#F8FAFC] group-hover:text-[#38BDF8] transition-none uppercase">
              Research Topics
            </Link>
          </li>
        </ul>
        
        <div className="mt-8 pt-6 border-t border-[#30363D]">
          <div className="bg-[#0D1117] border border-[#30363D] p-5">
            <h4 className="font-mono text-[#EAB308] text-xs mb-3 uppercase tracking-widest">[ METRICS ]</h4>
            <div className="flex justify-between items-center text-xs font-mono text-[#F8FAFC] opacity-80 mb-2 border-b border-[#30363D] pb-2">
              <span>IMPACT_FACTOR:</span>
              <span className="font-bold text-[#38BDF8]">4.2</span>
            </div>
            <div className="flex justify-between items-center text-xs font-mono text-[#F8FAFC] opacity-80 pt-1">
              <span>ACCEPTANCE_RATE:</span>
              <span className="font-bold text-[#38BDF8]">28%</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
