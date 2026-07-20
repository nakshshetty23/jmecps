import Sidebar from "@/components/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Editor's Message | JMECPS",
  description: "Monthly message from the Editor's Desk: Recent Trends in Mechanical, Electronics and Cyber Physical Systems.",
};

export default function MonthlyMessage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-border text-accent">
            [ FROM THE EDITOR'S DESK ]
          </h1>
          
          <div className="card-terminal relative border-primary">
            {/* Decorative System Indicator */}
            <div className="absolute top-0 right-0 px-3 py-1 bg-background border-l border-b border-border font-mono text-xs text-border">
              SYS_MSG_001
            </div>

            <h2 className="heading-display text-2xl text-text mb-6 pl-4 border-l-2 border-accent">
              Recent Trends in Mechanical, Electronics and Cyber Physical Systems
            </h2>
            
            <div className="space-y-5 text-[1.05rem] leading-relaxed text-text opacity-80 text-justify">
              <p>
                Welcome to The Journal of Mechanical, Electronics and Cyber Physical System (JMECPS). It is with great enthusiasm that I share this editorial message highlighting the recent trends and transformative developments shaping the future of engineering research across Mechanical Engineering, Electronics, and Cyber Physical Systems.
              </p>
              
              <p>
                The modern engineering landscape is rapidly evolving through the convergence of physical systems with intelligent digital technologies. Traditional mechanical systems are being redefined through automation, smart sensing, advanced materials, and data-driven decision-making. The emergence of intelligent manufacturing and sustainable design practices is enabling industries to become more efficient, reliable, and environmentally responsible.
              </p>
              
              <p>
                In the field of <strong className="text-primary font-bold">Mechanical Engineering</strong>, key trends include additive manufacturing, smart materials, digital twin technologies, energy-efficient systems, autonomous vehicles, precision manufacturing, and sustainable thermal systems. Research in robotics, mechatronics, and advanced production systems is also opening new opportunities for innovation.
              </p>
              
              <p>
                <strong className="text-primary font-bold">Electronics Engineering</strong> continues to drive technological progress through miniaturized devices, embedded systems, intelligent sensors, wireless communication, semiconductor advancements, and real-time control technologies. The increasing demand for connected systems has accelerated research in low-power electronics, wearable devices, healthcare instrumentation, and smart communication networks.
              </p>
              
              <p>
                <strong className="text-primary font-bold">Cyber Physical Systems (CPS)</strong> represent one of the most exciting frontiers of modern engineering. CPS integrates computation, communication, and physical processes into intelligent interconnected systems. Smart factories, autonomous transportation, healthcare monitoring systems, smart grids, and intelligent infrastructure are excellent examples of CPS transforming society.
              </p>
              
              <p>
                <strong className="text-primary font-bold">Artificial Intelligence and Machine Learning</strong> are now deeply integrated into all engineering sectors. Predictive maintenance, fault diagnosis, process optimization, image-based inspection, autonomous control, and intelligent resource management are becoming essential components of next-generation systems.
              </p>
              
              <p>
                The <strong className="text-primary font-bold">Internet of Things (IoT)</strong> is further enabling real-time monitoring, remote control, and seamless connectivity among devices and machines. Combined with cloud computing and edge intelligence, IoT is creating highly responsive and adaptive engineering ecosystems.
              </p>
              
              <p>
                <strong className="text-primary font-bold">Sustainability</strong> has become a central priority across all domains. Energy conservation, renewable technologies, green manufacturing, waste reduction, and carbon-aware engineering solutions are receiving global attention. Future engineering must not only be intelligent but also sustainable and socially responsible.
              </p>
              
              <p>
                At JMECPS, we encourage researchers, academicians, industry experts, and innovators to contribute high-quality research that addresses these emerging challenges and opportunities. Interdisciplinary collaboration will be the key driver of future progress.
              </p>
              
              <p className="mt-4">
                We remain committed to publishing impactful, peer-reviewed, open-access research that advances knowledge and benefits society worldwide.
              </p>
              
              <p>
                I warmly invite the global research community to join us in shaping the future of engineering innovation.
              </p>
            </div>

            <div className="mt-10 pt-6 border-t border-border flex items-center justify-between font-mono text-sm uppercase tracking-widest">
              <div>
                <h3 className="heading-display text-xl text-primary mb-1">EDITOR-IN-CHIEF</h3>
                <p className="text-text opacity-60">
                  JMECPS
                </p>
                <a href="https://www.jmecps.com" target="_blank" rel="noopener noreferrer" className="text-accent hover:text-text transition-none mt-2 inline-block">
                  [WWW.JMECPS.COM]
                </a>
              </div>
              <div className="hidden sm:flex w-16 h-16 border-2 border-accent items-center justify-center text-accent heading-display text-2xl">
                JM
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
