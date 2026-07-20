import Sidebar from "@/components/shared/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subjects Covered | JMECPS",
  description: "List of research subjects covered by the journal.",
};

export default function Subjects() {
  const areas = [
    "Electrical Engineering & Renewable Energy",
    "Computer Science & Software Architecture",
    "Civil Infrastructure & Environmental Design",
    "Mechanical & Aerospace Engineering",
    "Artificial Intelligence & Machine Learning",
    "Biomedical Engineering",
    "Materials Science & Nanotechnology",
    "Cybersecurity & Data Privacy"
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">
      
      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-border text-accent">
            [ SUBJECTS COVERED ]
          </h1>
          <div className="card-terminal">
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {areas.map((area, idx) => (
                <li key={idx} className="group flex items-center space-x-4 text-text p-4 bg-background border border-border hover:border-primary transition-none">
                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 text-primary border border-primary font-mono group-hover:bg-primary group-hover:text-text transition-none">
                    <span className="text-sm font-bold">{(idx + 1).toString().padStart(2, '0')}</span>
                  </div>
                  <span className="font-mono text-sm opacity-80 uppercase tracking-widest">{area}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="w-full lg:w-80 flex-shrink-0">
          <Sidebar />
        </div>
      </div>
    </div>
  );
}
