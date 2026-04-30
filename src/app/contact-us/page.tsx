import Sidebar from "@/components/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us | JMECPS",
  description: "Contact the editorial board and journal office at JMECPS.",
};

export default function Contact() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-[#30363D] text-[#EAB308]">
            [ CONTACT US ]
          </h1>
          
          <div className="card-terminal mb-8">
             <p className="text-[1.05rem] text-[#F8FAFC] opacity-80 leading-relaxed mb-6">
               We welcome your inquiries, feedback, and submissions. Please use the appropriate contact information below to reach out to the right department. We aim to respond to all emails promptly.
             </p>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               
               {/* APC Queries Card */}
               <div className="bg-[#161B22] border border-[#30363D] p-6 hover:border-[#38BDF8] transition-none">
                 <h2 className="heading-display text-xl text-[#F8FAFC] mb-4 flex items-center border-b border-[#30363D] pb-2">
                   <span className="text-[#38BDF8] mr-3">[APC]</span>
                   Contact for APC Queries
                 </h2>
                 <div className="space-y-3 font-mono text-sm text-[#F8FAFC] opacity-80">
                   <p className="flex items-center gap-2">
                     <span className="w-16 text-[#EAB308]">Email:</span> 
                     <a href="mailto:accounts@jmecps.com" className="hover:text-[#38BDF8] transition-none">accounts@jmecps.com</a>
                   </p>
                   <p className="flex items-center gap-2">
                     <span className="w-16 text-[#EAB308]">Email:</span> 
                     <a href="mailto:editor@jmecps.com" className="hover:text-[#38BDF8] transition-none">editor@jmecps.com</a>
                   </p>
                   <p className="flex items-center gap-2">
                     <span className="w-16 text-[#EAB308]">Website:</span> 
                     <a href="https://www.jmecps.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#38BDF8] transition-none">www.jmecps.com</a>
                   </p>
                 </div>
               </div>

               {/* Journal Office Card */}
               <div className="bg-[#161B22] border border-[#30363D] p-6 hover:border-[#EAB308] transition-none">
                 <h2 className="heading-display text-xl text-[#F8FAFC] mb-4 flex items-center border-b border-[#30363D] pb-2">
                   <span className="text-[#EAB308] mr-3">[OFC]</span>
                   Journal Office
                 </h2>
                 <div className="space-y-3 font-mono text-sm text-[#F8FAFC] opacity-80">
                   <p className="font-bold text-[#F8FAFC] mb-2 uppercase tracking-widest">JMECPS Editorial Office</p>
                   <p className="flex items-center gap-2">
                     <span className="w-16 text-[#38BDF8]">Email:</span> 
                     <a href="mailto:editor@jmecps.com" className="hover:text-[#EAB308] transition-none">editor@jmecps.com</a>
                   </p>
                   <p className="flex items-center gap-2">
                     <span className="w-16 text-[#38BDF8]">Website:</span> 
                     <a href="https://www.jmecps.com" target="_blank" rel="noopener noreferrer" className="hover:text-[#EAB308] transition-none">www.jmecps.com</a>
                   </p>
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
