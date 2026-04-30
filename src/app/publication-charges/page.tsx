import Sidebar from "@/components/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Publication Charges | JMECPS",
  description: "Article Processing Charges, waiver policy, and payment details for JMECPS.",
};

export default function PublicationCharges() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-[#30363D] text-[#EAB308]">
            [ PUBLICATION CHARGES & WAIVER POLICY ]
          </h1>
          
          <div className="card-terminal mb-8">
            <h2 className="heading-display text-2xl text-[#F8FAFC] mb-4">
              The Journal of Mechanical, Electronics and Cyber Physical System
            </h2>
            <p className="text-[1.05rem] text-[#F8FAFC] opacity-80 leading-relaxed text-justify mb-4">
              JMECPS is committed to maintaining a transparent, fair and ethical publication fee policy. The journal follows an open-access publishing model to ensure that published research is freely accessible to readers worldwide without subscription barriers.
            </p>
            <p className="text-[1.05rem] text-[#F8FAFC] opacity-80 leading-relaxed text-justify">
              To support editorial management, peer review coordination, website hosting, archiving, formatting and publication services, Article Processing Charges (APC) may apply <strong className="text-[#38BDF8]">only for accepted manuscripts</strong>.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-[#161B22] border border-[#30363D] p-6 flex flex-col items-center text-center justify-center border-t-2 border-t-[#38BDF8]">
              <h3 className="heading-display text-xl text-[#F8FAFC] mb-2">Submission Fee</h3>
              <p className="font-mono text-3xl font-bold text-[#38BDF8] mb-2">NIL</p>
              <p className="font-mono text-xs text-[#F8FAFC] opacity-60 tracking-widest uppercase">No fee is charged for manuscript submission.</p>
            </div>
            
            <div className="bg-[#161B22] border border-[#30363D] p-6 flex flex-col items-center text-center justify-center border-t-2 border-t-[#EAB308]">
              <h3 className="heading-display text-xl text-[#F8FAFC] mb-2">Review Fee</h3>
              <p className="font-mono text-3xl font-bold text-[#EAB308] mb-2">NIL</p>
              <p className="font-mono text-xs text-[#F8FAFC] opacity-60 tracking-widest uppercase">No fee is charged for the peer-review process.</p>
            </div>
          </div>

          <div className="card-terminal mb-8 border-[#EAB308]">
            <h3 className="heading-display text-2xl text-[#F8FAFC] mb-6 border-b border-[#30363D] pb-3">
              Publication Fee (After Acceptance Only)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-[#0D1117] border border-[#30363D] p-5">
                <p className="font-mono text-xs text-[#EAB308] uppercase tracking-widest mb-2">[ INDIAN AUTHORS ]</p>
                <p className="heading-display text-2xl text-[#F8FAFC]">INR [ENTER AMOUNT]</p>
              </div>
              <div className="bg-[#0D1117] border border-[#30363D] p-5">
                <p className="font-mono text-xs text-[#38BDF8] uppercase tracking-widest mb-2">[ INT. AUTHORS ]</p>
                <p className="heading-display text-2xl text-[#F8FAFC]">USD [ENTER AMOUNT]</p>
              </div>
            </div>
            <p className="font-mono text-xs text-[#F8FAFC] opacity-60 tracking-widest uppercase">
              * APC is payable only after the manuscript has successfully completed peer review and has been formally accepted for publication.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div className="bg-[#161B22] border border-[#30363D] p-6">
              <h3 className="heading-display text-xl text-[#F8FAFC] mb-4 border-b border-[#30363D] pb-2">What the APC Covers</h3>
              <ul className="space-y-3 font-mono text-sm text-[#F8FAFC] opacity-80">
                {[
                  "Editorial processing",
                  "Peer review management",
                  "Plagiarism screening",
                  "Copyediting and proofreading",
                  "Typesetting and formatting",
                  "DOI registration through Crossref (if applicable)",
                  "Online hosting and archiving",
                  "Open-access global availability",
                  "Metadata indexing support"
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <span className="text-[#38BDF8] mr-2">[+]</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-[#161B22] border border-[#30363D] p-6">
              <h3 className="heading-display text-xl text-[#F8FAFC] mb-4 border-b border-[#30363D] pb-2">Waiver and Discount Policy</h3>
              <p className="text-[0.95rem] text-[#F8FAFC] opacity-80 mb-4 leading-relaxed">
                JMECPS supports deserving researchers and promotes inclusive academic publishing. Partial or full APC waivers may be considered for:
              </p>
              <ul className="space-y-3 font-mono text-sm text-[#F8FAFC] opacity-80 mb-4">
                {[
                  "Students and early-career researchers",
                  "Authors from low-income countries",
                  "Exceptional invited papers",
                  "Special issue contributions (if approved)"
                ].map((item, i) => (
                  <li key={i} className="flex items-start">
                    <span className="w-1.5 h-1.5 bg-[#EAB308] mt-1.5 mr-3 flex-shrink-0"></span>
                    {item}
                  </li>
                ))}
              </ul>
              <p className="font-mono text-xs text-[#EAB308] p-3 bg-[#0D1117] border border-[#30363D] tracking-widest uppercase mt-4">
                SYS_NOTE: Requests for waiver consideration must be made during submission.
              </p>
            </div>
          </div>

          <div className="space-y-6 mb-8">
            <div className="bg-[#161B22] border border-[#30363D] p-6">
              <h3 className="heading-display text-xl text-[#F8FAFC] mb-4 border-b border-[#30363D] pb-2">
                <span className="text-[#EAB308]">[PAY]</span> Payment Policy
              </h3>
              <ul className="space-y-2 font-mono text-sm text-[#F8FAFC] opacity-80">
                <li className="flex items-start"><span className="text-[#30363D] mr-2">/</span> Payment instructions will be shared only after final acceptance.</li>
                <li className="flex items-start"><span className="text-[#30363D] mr-2">/</span> No author is required to pay any fee before acceptance.</li>
                <li className="flex items-start"><span className="text-[#30363D] mr-2">/</span> Payments must be made through official journal channels only.</li>
                <li className="flex items-start"><span className="text-[#30363D] mr-2">/</span> Official payment receipt/invoice will be issued after successful payment.</li>
              </ul>
            </div>
            
            <div className="bg-[#161B22] border border-[#30363D] p-6">
              <h3 className="heading-display text-xl text-[#F8FAFC] mb-4 border-b border-[#30363D] pb-2">
                <span className="text-[#38BDF8]">[REF]</span> Refund Policy
              </h3>
              <ul className="space-y-2 font-mono text-sm text-[#F8FAFC] opacity-80">
                <li className="flex items-start"><span className="text-[#30363D] mr-2">/</span> APC once paid is generally non-refundable after publication processing has commenced.</li>
                <li className="flex items-start"><span className="text-[#30363D] mr-2">/</span> If a manuscript is withdrawn before production begins, refund requests may be considered on a case-by-case basis.</li>
              </ul>
            </div>
          </div>

          <div className="bg-[#0D1117] border-l-2 border-[#EAB308] border-r border-t border-b border-[#30363D] p-6">
            <h3 className="heading-display text-lg text-[#F8FAFC] mb-2">Important Ethical Note</h3>
            <p className="text-[#F8FAFC] opacity-80 leading-relaxed text-sm">
              JMECPS strictly separates editorial decisions from financial considerations. Acceptance of manuscripts is based solely on academic merit, originality, relevance, and reviewer recommendations.
            </p>
          </div>

        </div>
        
        <div className="w-full lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
