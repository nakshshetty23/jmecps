import Sidebar from "@/components/shared/Sidebar";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Publication Policy & Ethics | JMECPS",
  description: "Ethics, guidelines, and publication policies of the Journal of Mechanical, Electronics and Cyber Physical System.",
};

const policies = [
  { 
    title: "Peer Review Process", 
    content: "All submitted manuscripts undergo a rigorous peer-review process to evaluate their originality, technical quality, relevance, significance and clarity. The journal follows a double-blind peer-review system, where the identities of both authors and reviewers remain confidential. Each manuscript is reviewed by qualified experts in the relevant field. Based on reviewers’ comments, the editorial board may accept, request revision or reject the manuscript. The final decision of publication rests with the Editor-in-Chief." 
  },
  { 
    title: "Originality and Plagiarism Policy", 
    content: "Authors must submit only original and unpublished work that is not under consideration elsewhere. All manuscripts are screened using plagiarism detection tools before review and publication. Any form of plagiarism, self-plagiarism, data fabrication, image manipulation or unethical reuse of content is strictly prohibited. Manuscripts with significant overlap or unethical practices will be rejected immediately." 
  },
  { 
    title: "Open Access Policy", 
    content: "JMECPS is a fully open-access journal. All published articles are freely and permanently accessible to readers worldwide without subscription or registration charges. The journal believes in the free exchange of scientific knowledge to accelerate innovation, education, and global collaboration." 
  },
  { 
    title: "Copyright and Licensing Policy", 
    content: "Authors retain copyright of their published work while granting the journal the right to publish and archive the article. Articles may be distributed, shared and cited with proper attribution to the original authors and journal source, subject to the applicable journal license policy." 
  },
  { 
    title: "Author Responsibilities", 
    content: "Authors are responsible for the accuracy, authenticity and integrity of the submitted research. All listed authors must have made significant academic contributions to the work. Authors should disclose funding sources, institutional approvals and any potential conflicts of interest. Submission of false information is considered unethical conduct." 
  },
  { 
    title: "Reviewer Responsibilities", 
    content: "Reviewers are expected to provide objective, constructive, confidential and timely evaluations of manuscripts. Reviewers should avoid personal criticism and declare any conflicts of interest before accepting review assignments. Manuscripts received for review must not be used for personal advantage." 
  },
  { 
    title: "Editorial Responsibilities", 
    content: "Editors shall evaluate manuscripts solely on academic merit, originality, clarity and relevance to the journal scope without discrimination based on nationality, gender, institutional affiliation or personal beliefs. Editors maintain confidentiality and ensure a fair and unbiased review process." 
  },
  { 
    title: "Conflict of Interest Policy", 
    content: "Authors, reviewers and editors must disclose any financial, professional, institutional or personal relationships that could influence the publication process. Appropriate action will be taken to maintain transparency and impartiality." 
  },
  { 
    title: "Retraction, Correction and Withdrawal Policy", 
    content: "If serious errors, ethical violations or unreliable findings are identified after publication, the journal may issue corrections, retractions or withdrawal notices as necessary. Such actions will follow accepted publishing ethics guidelines." 
  },
  { 
    title: "Data Availability and Reproducibility", 
    content: "Authors are encouraged to preserve research data, methods and supporting materials to enhance transparency and reproducibility. Where applicable, authors should provide access to datasets or supplementary materials." 
  },
  { 
    title: "Publication Frequency and Timeliness", 
    content: "JMECPS is committed to timely processing of submissions, fair review timelines, and regular publication schedules to ensure rapid dissemination of quality research." 
  },
  { 
    title: "Ethical Compliance", 
    content: "Research involving humans, animals, hazardous materials or sensitive data must comply with relevant institutional, national and international ethical guidelines. Necessary approvals must be clearly stated in the manuscript." 
  }
];

export default function Policy() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

      <div className="flex flex-col lg:flex-row gap-12">
        <div className="flex-grow">
          <h1 className="heading-display text-3xl pb-4 mb-8 border-b border-border text-accent">
            [ PUBLICATION POLICY & ETHICS ]
          </h1>
          
          <div className="card-terminal mb-8">
            <p className="text-[1.05rem] text-text opacity-80 leading-relaxed text-justify">
              The Journal of Mechanical, Electronics and Cyber Physical System (JMECPS) is committed to maintaining the highest standards of scholarly publishing, research integrity, transparency and ethical responsibility. The journal follows internationally accepted publication practices to ensure quality, fairness and credibility in academic publishing.
            </p>
          </div>

          <div className="space-y-6 mb-8">
            {policies.map((policy, index) => (
              <div key={index} className="card-terminal flex flex-col group hover:border-primary">
                <h3 className="heading-display text-xl text-text mb-3 flex items-start gap-3 border-b border-border pb-3 group-hover:border-primary">
                  <span className="flex-shrink-0 flex items-center justify-center w-8 h-8 border border-accent text-accent font-mono text-sm group-hover:bg-accent group-hover:text-text transition-none">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <span className="group-hover:text-primary">{policy.title}</span>
                </h3>
                <p className="text-sm text-text opacity-80 leading-relaxed text-justify">
                  {policy.content}
                </p>
              </div>
            ))}
          </div>

          <div className="bg-card border-t-2 border-t-[var(--color-accent)] border-l border-r border-b border-x-[var(--color-border)] border-b-[var(--color-border)] p-8">
            <p className="font-mono text-xs text-text opacity-60 leading-relaxed text-center uppercase tracking-widest">
              SYS_NOTE: JMECPS continuously strives to uphold integrity, quality, transparency and academic excellence in all stages of publication.
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
