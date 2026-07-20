import Sidebar from "@/components/shared/Sidebar";
import ResearchGrid from "@/features/manuscripts/components/ResearchGrid";
import { getLatestManuscripts } from "@/services/manuscript.service";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "JMECPS | Journal of Multidisciplinary Engineering and Computer Processing Systems",
  description: "High-quality academic research covering multidisciplinary engineering disciplines.",
};

export default function Home() {
  const latestManuscripts = getLatestManuscripts();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 relative z-10">
      
      {/* Hero Section */}
      <section className="bg-card border border-border p-10 md:p-14 mb-14 relative overflow-hidden">
        {/* Schematic overlay */}
        <div className="absolute top-0 right-0 w-1/2 h-full opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 100% 50%, var(--color-primary) 0%, transparent 60%)' }}></div>
        <div className="absolute top-0 right-0 p-4 font-mono text-xs text-border uppercase">SYS_INITIALIZED_</div>
        
        <div className="relative z-10">
          <h1 className="heading-display text-4xl md:text-6xl mb-6">
            Welcome to <span className="text-accent">JMECPS</span>
          </h1>
          <p className="text-lg md:text-xl text-text opacity-80 max-w-3xl leading-relaxed">
            The Premier Journal of Multidisciplinary Engineering and Computer Processing Systems. 
            Advancing the frontier of modern scientific discovery with peer-reviewed excellence.
          </p>
          <div className="mt-8">
            <button className="btn-primary">
              Explore Latest Issue
            </button>
          </div>
        </div>
      </section>

      <div className="flex flex-col lg:flex-row gap-12">
        {/* Main Content Area */}
        <div className="flex-grow">
          
          {/* Why Publish With Us Section */}
          <div className="mb-8 card-terminal">
            <h2 className="heading-display text-2xl pb-2 mb-6 border-b border-border text-primary">
              [ WHY PUBLISH WITH US ]
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                "Rigorous Peer Review",
                "Fast Editorial Decision",
                "Open Access Visibility",
                "International Editorial Support",
                "Multidisciplinary Scope",
                "Global Reach"
              ].map((benefit, i) => (
                <div key={i} className="flex items-center p-4 bg-background border border-border hover:border-accent transition-none group">
                  <div className="flex-shrink-0 w-6 h-6 border border-primary text-primary flex items-center justify-center mr-4 group-hover:bg-primary group-hover:text-text transition-none">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="square" strokeLinejoin="miter" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="font-mono text-sm text-text">{benefit}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-8">
            <h2 className="heading-display text-2xl pb-2 mb-6 border-b border-border text-accent">
              [ LATEST PUBLICATIONS ]
            </h2>
            <ResearchGrid papers={latestManuscripts} />
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
