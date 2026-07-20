import Sidebar from "@/components/shared/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editorial Board | JMECPS",
  description: "Meet the editorial board and review panel of the Journal of Mechanical, Electronics and Cyber Physical System.",
};

const boardSections = [
  {
    title: "Editor-in-Chief",
    members: [
      { name: "[Name]", qualification: "[Qualification, e.g., Ph.D.]", institution: "[University/Institution Name]", country: "[Country]", email: "editor@jmecps.com" }
    ]
  },
  {
    title: "Managing Editor",
    members: [
      { name: "[Name]", qualification: "[Qualification]", institution: "[Institution Name]", country: "[Country]", email: "managing@jmecps.com" }
    ]
  },
  {
    title: "Associate Editors",
    members: [
      { name: "[Name]", qualification: "[Qualification]", institution: "[Institution Name]", country: "[Country]", email: "associate@jmecps.com" },
      { name: "[Name]", qualification: "[Qualification]", institution: "[Institution Name]", country: "[Country]", email: "" }
    ]
  },
  {
    title: "International Advisory Board",
    members: [
      { name: "[Name]", qualification: "[Qualification]", institution: "[Institution Name]", country: "[Country]", email: "" },
      { name: "[Name]", qualification: "[Qualification]", institution: "[Institution Name]", country: "[Country]", email: "" }
    ]
  },
  {
    title: "Review Panel Members",
    members: [
      { name: "[Name]", qualification: "[Qualification]", institution: "[Institution Name]", country: "[Country]", email: "" },
      { name: "[Name]", qualification: "[Qualification]", institution: "[Institution Name]", country: "[Country]", email: "" },
      { name: "[Name]", qualification: "[Qualification]", institution: "[Institution Name]", country: "[Country]", email: "" }
    ]
  }
];

export default function EditorialBoard() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-border text-accent">
            [ EDITORIAL BOARD ]
          </h1>
          
          <div className="card-terminal mb-8">
            <h2 className="heading-display text-2xl text-text mb-4 flex items-center gap-3">
              Introductory Note
            </h2>
            <p className="text-[1.05rem] text-text opacity-80 leading-relaxed text-justify">
              Welcome to the Editorial Board of The Journal of Mechanical, Electronics and Cyber Physical System (JMECPS). Our editorial team consists of distinguished academicians, researchers, scientists, and industry experts dedicated to maintaining excellence, integrity, and innovation in scholarly publishing.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card-terminal">
              <h3 className="heading-display text-xl text-primary mb-4 border-b border-border pb-2">
                Board Structure Requirements
              </h3>
              <ul className="space-y-3 font-mono text-sm text-text opacity-80">
                {[
                  "1 Editor-in-Chief",
                  "1 Managing Editor",
                  "5 Associate Editors",
                  "10 Reviewers",
                  "5 International Advisors"
                ].map((req, i) => (
                  <li key={i} className="flex items-center">
                    <span className="w-1.5 h-1.5 bg-accent mr-3"></span>
                    {req}
                  </li>
                ))}
              </ul>
            </div>

            <div className="card-terminal">
              <h3 className="heading-display text-xl text-accent mb-4 border-b border-border pb-2">
                Associate Editors Domains
              </h3>
              <p className="font-mono text-xs text-primary mb-3 uppercase tracking-widest">Experts from different domains:</p>
              <div className="flex flex-wrap gap-2">
                {["Mechanical Engineering", "Electronics Engineering", "AI / ML", "Robotics", "IoT", "Manufacturing", "Control Systems"].map((domain, i) => (
                  <span key={i} className="px-3 py-1 bg-background border border-border text-text opacity-80 text-xs font-mono uppercase tracking-widest">
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card-terminal mb-10 border-primary">
            <h3 className="heading-display text-xl text-text mb-2">
              International Advisory Board
            </h3>
            <p className="font-mono text-sm text-text opacity-80 mb-4">
              Very valuable for global credibility. Include members from countries such as:
            </p>
            <div className="flex flex-wrap gap-3">
              {["USA", "UK", "Germany", "Canada", "Australia", "Japan", "Singapore", "UAE"].map((country, i) => (
                <div key={i} className="flex items-center px-4 py-2 bg-background border border-border font-mono text-sm text-text uppercase tracking-widest">
                  <span className="text-primary mr-2">[+]</span> {country}
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-10 mb-8">
            {boardSections.map((section, idx) => (
              <div key={idx}>
                <h2 className="heading-display text-2xl text-accent mb-6 flex items-center gap-3 border-b border-border pb-3">
                  <span className="w-2 h-6 bg-primary"></span>
                  {section.title}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {section.members.map((member, mIdx) => (
                    <div key={mIdx} className="bg-card border border-border p-6 hover:border-primary transition-none group flex flex-col h-full">
                      <h3 className="heading-display text-lg text-text mb-1 group-hover:text-accent">
                        {member.name}
                      </h3>
                      {member.qualification && (
                        <p className="font-mono text-xs text-primary mb-3 uppercase tracking-widest">
                          {member.qualification}
                        </p>
                      )}
                      
                      <div className="space-y-2 mt-auto font-mono text-sm text-text opacity-80">
                        <p className="flex items-start gap-2">
                          <span className="text-accent">[I]</span>
                          <span>{member.institution}</span>
                        </p>
                        <p className="flex items-start gap-2">
                          <span className="text-accent">[L]</span>
                          <span>{member.country}</span>
                        </p>
                        {member.email && (
                          <p className="flex items-start gap-2">
                            <span className="text-accent">[C]</span>
                            <a href={`mailto:${member.email}`} className="hover:text-primary transition-none">
                              {member.email}
                            </a>
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
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
