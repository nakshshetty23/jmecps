import Sidebar from "@/components/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vision and Mission | JMECPS",
  description: "Vision and Mission of the Journal of Mechanical, Electronics and Cyber Physical System.",
};

export default function VisionAndMission() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-[#30363D] text-[#EAB308]">
            [ VISION & MISSION ]
          </h1>
          
          {/* Vision Card */}
          <div className="card-terminal mb-8 border-[#38BDF8]">
            <h2 className="heading-display text-2xl text-[#F8FAFC] mb-4 flex items-center gap-3">
              Vision
            </h2>
            <p className="text-[1.05rem] text-[#F8FAFC] opacity-80 leading-relaxed text-justify">
              To be a globally recognized, high-impact, peer-reviewed open-access journal that advances excellence in Mechanical, Electronics and Cyber Physical Systems research by fostering innovation, interdisciplinary collaboration and sustainable technological development for the benefit of society worldwide.
            </p>
          </div>

          {/* Mission Card */}
          <div className="card-terminal mb-8 border-[#EAB308]">
            <h2 className="heading-display text-2xl text-[#F8FAFC] mb-6 flex items-center gap-3">
              Mission
            </h2>
            <ul className="space-y-4 font-mono text-sm text-[#F8FAFC] opacity-80">
              {[
                "To publish high-quality, original, and impactful research articles, review papers, and technical communications in the fields of Mechanical Engineering, Electronics Engineering and Cyber Physical Systems.",
                "To maintain a rigorous, transparent, fair, and timely peer-review process that ensures the highest standards of academic integrity, ethics and scholarly excellence.",
                "To promote interdisciplinary research integrating emerging technologies such as Artificial Intelligence, Internet of Things, Robotics, Automation, Smart Manufacturing and Sustainable Engineering Systems.",
                "To provide free and unrestricted global access to scientific knowledge through an open-access publishing model that benefits researchers, educators, industries and society.",
                "To strengthen global collaboration, support young researchers and continuously enhance the journal’s quality, visibility, and international reputation through excellence in publication practices."
              ].map((item, index) => (
                <li key={index} className="flex items-start gap-4 leading-relaxed text-justify">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 border border-[#EAB308] text-[#EAB308] text-xs mt-0.5">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <span>{item}</span>
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
