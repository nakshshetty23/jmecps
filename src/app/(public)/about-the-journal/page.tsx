import Sidebar from "@/components/shared/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | JMECPS",
  description: "Learn more about the Journal of Multidisciplinary Engineering and Computer Processing Systems.",
};

export default function About() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-border text-accent">
            [ ABOUT THE JOURNAL ]
          </h1>
          {/* Lead/Hero Card */}
          <div className="card-terminal mb-8">
            <h2 className="heading-display text-2xl text-text mb-4">Advancing Multidisciplinary Engineering</h2>
            <p className="text-[1.05rem] text-text opacity-80 leading-relaxed text-justify">
              <strong className="text-primary font-bold">The Journal of Mechanical, Electronics and Cyber Physical System (JMECPS)</strong>, a peer-reviewed, open-access international journal dedicated to advancing knowledge and innovation in multidisciplinary engineering domains. The journal provides a dynamic platform for researchers, academicians, industry professionals and scholars to publish original and impactful research contributions. JMECPS focuses on the integration of Mechanical Engineering, Electronics Engineering and Cyber Physical Systems, promoting cross-disciplinary collaboration and technological progress.
            </p>
          </div>

          {/* Grid of Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Card 1: Focus Area */}
            <div className="card-terminal flex flex-col">
              <h3 className="heading-display text-xl text-text mb-3 border-b border-border pb-2">Focus & Scope</h3>
              <p className="text-sm text-text opacity-80 leading-relaxed text-justify flex-grow">
                JMECPS welcomes high-quality manuscripts that present novel theories, experimental investigations, design methodologies, simulation studies and real-world engineering applications. JMECPS aims to bridge the gap between traditional engineering disciplines and emerging intelligent systems by encouraging research in automation, robotics, embedded systems, smart manufacturing, artificial intelligence, IoT, control systems, renewable energy and sustainable technologies.
              </p>
            </div>

            {/* Card 2: Open Access */}
            <div className="card-terminal flex flex-col">
              <h3 className="heading-display text-xl text-text mb-3 border-b border-border pb-2">Open Access & Peer Review</h3>
              <p className="text-sm text-text opacity-80 leading-relaxed text-justify flex-grow">
                As an open-access journal, JMECPS ensures that published articles are freely available to readers worldwide, enabling rapid dissemination of scientific knowledge without subscription barriers. The journal believes that unrestricted access to research accelerates innovation, learning and global collaboration. Every manuscript submitted to JMECPS undergoes a rigorous peer-review process conducted by qualified experts to maintain the highest standards of academic quality, originality and ethical publishing practices. The editorial board is composed of experienced researchers and professionals committed to fair, transparent and timely review procedures.
              </p>
            </div>

            {/* Card 3: Submissions */}
            <div className="card-terminal flex flex-col">
              <h3 className="heading-display text-xl text-text mb-3 border-b border-border pb-2">Who Should Submit?</h3>
              <p className="text-sm text-text opacity-80 leading-relaxed text-justify flex-grow">
                JMECPS encourages submissions from both established researchers and early-career scholars who seek to contribute meaningful advancements to the engineering community. The journal publishes research articles, review papers, case studies, technical notes, and short communications covering both fundamental and applied research.
              </p>
            </div>

            {/* Card 4: Vision */}
            <div className="card-terminal flex flex-col">
              <h3 className="heading-display text-xl text-text mb-3 border-b border-border pb-2">Our Vision</h3>
              <p className="text-sm text-text opacity-80 leading-relaxed text-justify flex-grow">
                With a vision to become a globally recognized source of engineering excellence, JMECPS continuously supports innovation-driven research that addresses industrial challenges and societal needs. The journal serves as a valuable resource for scientists, engineers, educators, policymakers, and students. Through quality publications and global accessibility, JMECPS strives to shape the future of modern engineering and cyber physical technologies.
              </p>
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
