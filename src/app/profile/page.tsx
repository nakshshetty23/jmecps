import Sidebar from "@/components/Sidebar";
import Link from "next/link";

export default function Profile() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <div className="flex items-center justify-between border-b border-[#30363D] pb-4 mb-8">
            <h1 className="heading-display text-3xl text-[#EAB308]">
              [ NODE_PROFILE ]
            </h1>
            <span className="font-mono text-sm text-[#38BDF8] border border-[#38BDF8] px-3 py-1 bg-[#0D1117]">
              SYS_STATUS: ONLINE
            </span>
          </div>
          
          {/* Identity Card */}
          <div className="card-terminal mb-8 border-[#38BDF8] relative overflow-hidden">
            <div className="absolute top-0 right-0 px-3 py-1 bg-[#0D1117] border-l border-b border-[#30363D] font-mono text-xs text-[#30363D]">
              ID_CARD_ACTIVE
            </div>

            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="flex-shrink-0">
                <div className="w-32 h-32 border-2 border-[#38BDF8] flex items-center justify-center bg-[#0D1117] relative">
                  <div className="absolute top-1 left-1 w-2 h-2 bg-[#EAB308]"></div>
                  <div className="absolute bottom-1 right-1 w-2 h-2 bg-[#38BDF8]"></div>
                  <span className="heading-display text-5xl text-[#F8FAFC]">AT</span>
                </div>
              </div>
              
              <div className="flex-grow">
                <h2 className="heading-display text-2xl text-[#F8FAFC] mb-1">
                  Dr. Alan Turing
                </h2>
                <p className="font-mono text-sm text-[#EAB308] uppercase tracking-widest mb-4">
                  [ AUTHOR / REVIEWER ]
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-sm text-[#F8FAFC] opacity-80">
                  <div className="flex flex-col border-b border-[#30363D] pb-2">
                    <span className="text-xs text-[#38BDF8] uppercase tracking-widest mb-1">System ID</span>
                    <span>USR-9024X</span>
                  </div>
                  <div className="flex flex-col border-b border-[#30363D] pb-2">
                    <span className="text-xs text-[#38BDF8] uppercase tracking-widest mb-1">Email Address</span>
                    <span>alan.turing@example.edu</span>
                  </div>
                  <div className="flex flex-col border-b border-[#30363D] pb-2">
                    <span className="text-xs text-[#38BDF8] uppercase tracking-widest mb-1">Institution</span>
                    <span>Institute of Advanced Technology</span>
                  </div>
                  <div className="flex flex-col border-b border-[#30363D] pb-2">
                    <span className="text-xs text-[#38BDF8] uppercase tracking-widest mb-1">Department</span>
                    <span>Computer Science & Engineering</span>
                  </div>
                </div>
                
                <div className="mt-4 flex gap-3">
                  <button className="btn-primary py-2 px-4 text-xs">
                    EDIT_PROFILE
                  </button>
                  <button className="border border-[#30363D] text-[#F8FAFC] font-mono text-xs hover:border-[#EAB308] hover:text-[#EAB308] px-4 py-2 uppercase tracking-widest transition-none bg-[#0D1117]">
                    UPDATE_CREDENTIALS
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="card-terminal flex flex-col items-center justify-center text-center p-6 hover:border-[#EAB308]">
              <span className="heading-display text-4xl text-[#EAB308] mb-2">03</span>
              <span className="font-mono text-xs text-[#F8FAFC] opacity-60 uppercase tracking-widest">Total Submissions</span>
            </div>
            <div className="card-terminal flex flex-col items-center justify-center text-center p-6 hover:border-[#38BDF8]">
              <span className="heading-display text-4xl text-[#38BDF8] mb-2">01</span>
              <span className="font-mono text-xs text-[#F8FAFC] opacity-60 uppercase tracking-widest">Under Review</span>
            </div>
            <div className="card-terminal flex flex-col items-center justify-center text-center p-6 hover:border-[#EAB308]">
              <span className="heading-display text-4xl text-[#EAB308] mb-2">02</span>
              <span className="font-mono text-xs text-[#F8FAFC] opacity-60 uppercase tracking-widest">Published</span>
            </div>
            <div className="card-terminal flex flex-col items-center justify-center text-center p-6 hover:border-[#38BDF8]">
              <span className="heading-display text-4xl text-[#38BDF8] mb-2">05</span>
              <span className="font-mono text-xs text-[#F8FAFC] opacity-60 uppercase tracking-widest">Reviews Completed</span>
            </div>
          </div>

          {/* Activity Log */}
          <div className="card-terminal">
            <h3 className="heading-display text-xl text-[#F8FAFC] mb-4 border-b border-[#30363D] pb-3">
              [ RECENT_ACTIVITY ]
            </h3>
            
            <div className="space-y-4 font-mono text-sm">
              <div className="flex justify-between items-center p-3 border border-[#30363D] bg-[#0D1117]">
                <div>
                  <span className="text-[#38BDF8] block mb-1">MANUSCRIPT SUBMITTED</span>
                  <span className="text-[#F8FAFC] opacity-80 text-xs">"Cyber Physical Systems in Autonomous Manufacturing"</span>
                </div>
                <div className="text-right">
                  <span className="block text-[#F8FAFC] opacity-50 text-xs">2026-04-12</span>
                  <span className="text-[#EAB308] text-xs">STATUS: UNDER REVIEW</span>
                </div>
              </div>
              
              <div className="flex justify-between items-center p-3 border border-[#30363D] bg-[#0D1117]">
                <div>
                  <span className="text-[#EAB308] block mb-1">REVIEW SUBMITTED</span>
                  <span className="text-[#F8FAFC] opacity-80 text-xs">"AI-Driven Predictive Maintenance in Industrial IoT"</span>
                </div>
                <div className="text-right">
                  <span className="block text-[#F8FAFC] opacity-50 text-xs">2026-03-28</span>
                  <span className="text-[#38BDF8] text-xs">STATUS: COMPLETED</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3 border border-[#30363D] bg-[#0D1117]">
                <div>
                  <span className="text-[#38BDF8] block mb-1">MANUSCRIPT PUBLISHED</span>
                  <span className="text-[#F8FAFC] opacity-80 text-xs">"Advances in Robotics and Mechatronics Systems"</span>
                </div>
                <div className="text-right">
                  <span className="block text-[#F8FAFC] opacity-50 text-xs">2026-01-15</span>
                  <Link href="/current-issue" className="text-[#EAB308] text-xs hover:text-[#F8FAFC] underline transition-none">VIEW_ARTICLE</Link>
                </div>
              </div>
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
