import Sidebar from "@/components/shared/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Aims & Scope | JMECPS",
  description: "Research aims and scope covered by the Journal of Mechanical, Electronics and Cyber Physical System.",
};

const scopeItems = [
  "Mechanical Design, Manufacturing and Production Engineering",
  "Thermal Engineering, Energy Systems and Fluid Mechanics",
  "Materials Science, Composite Materials and Nanotechnology",
  "Robotics, Mechatronics and Automation Systems",
  "Electronics Circuits, Devices and Embedded Systems",
  "Communication Engineering, Signal Processing and Networks",
  "Sensors, Instrumentation and Control Engineering",
  "Cyber Physical Systems and Smart Integrated Technologies",
  "Internet of Things (IoT) and Industrial IoT Applications",
  "Artificial Intelligence, Machine Learning and Data Analytics in Engineering",
  "Smart Manufacturing and Industry 4.0 Technologies",
  "Renewable Energy and Sustainable Engineering Solutions",
  "Autonomous Systems, Drones and Intelligent Vehicles",
  "Biomedical Devices and Healthcare Engineering Technologies",
  "Computer-Aided Design, Simulation and Digital Twin Systems",
  "Reliability, Maintenance and Quality Engineering",
  "Environmental Engineering and Green Technologies",
  "Interdisciplinary Engineering Innovations and Emerging Technologies",
];

export default function Scope() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-border text-accent">
            [ AIM & SCOPE ]
          </h1>
          
          {/* Aim Card */}
          <div className="card-terminal mb-8 border-primary">
            <h2 className="heading-display text-2xl text-text mb-4 flex items-center gap-3">
              <span className="text-primary">[AIM]</span>
              Aim
            </h2>
            <p className="text-[1.05rem] text-text opacity-80 leading-relaxed text-justify">
              The Journal of Mechanical, Electronics and Cyber Physical System (JMECPS) aims to provide a high-quality, peer-reviewed, open-access international platform for the publication of original research, innovative developments and scholarly advancements in the fields of Mechanical Engineering, Electronics Engineering and Cyber Physical Systems. The journal is committed to promoting interdisciplinary knowledge, technological innovation, industrial relevance and sustainable solutions that address present and future engineering challenges.
            </p>
          </div>

          {/* Scope Card */}
          <div className="card-terminal mb-8">
            <h2 className="heading-display text-2xl text-text mb-4 flex items-center gap-3 border-b border-border pb-3">
              <span className="text-accent">[SCP]</span>
              Scope
            </h2>
            <p className="text-[1.05rem] text-text opacity-80 leading-relaxed text-justify mb-6">
              JMECPS welcomes high-quality manuscripts including research articles, review papers, case studies, technical notes, and short communications in, but not limited to, the following areas:
            </p>
            
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 list-none pl-0 mb-8 font-mono text-sm text-text opacity-80 uppercase tracking-widest">
              {scopeItems.map((item, id) => (
                <li key={id} className="flex items-center p-3 bg-background border border-border hover:border-primary transition-none group">
                  <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 border border-primary text-primary text-xs mr-3 group-hover:bg-primary group-hover:text-text transition-none">
                    {(id + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="leading-tight">{item}</span>
                </li>
              ))}
            </ul>
            
            <p className="font-mono text-xs text-accent border border-border p-4 bg-background uppercase tracking-widest text-justify leading-relaxed">
              SYS_NOTE: JMECPS encourages contributions from researchers, academicians, industry professionals and innovators worldwide to advance engineering science and technology for global benefit.
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
