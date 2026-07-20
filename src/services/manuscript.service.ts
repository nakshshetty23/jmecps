import type { ResearchPaper } from "@/types/manuscript";

export function getLatestManuscripts(): ResearchPaper[] {
  return [
    {
      id: "1",
      title: "Advancements in Quantum Computing Architectures",
      author: "Dr. Jane Doe, Dr. John Smith",
      abstract:
        "This paper explores the latest hardware architectures that enable scalable quantum information processing...",
      date: "March 2026",
    },
    {
      id: "2",
      title: "Machine Learning Approaches for Grid Optimization",
      author: "Alice Johnson",
      abstract:
        "A novel approach using deep reinforcement learning to balance load dynamically in smart power grids...",
      date: "February 2026",
    },
    {
      id: "3",
      title: "Sustainable Materials in Civil Infrastructure",
      author: "Robert Williams, Emily Chen",
      abstract:
        "Analyzing the life cycle and potential of recycled concrete alternatives in urban civil engineering projects...",
      date: "January 2026",
    },
    {
      id: "4",
      title: "Edge Devices in IoT Analytics",
      author: "David Lee",
      abstract:
        "Offloading intensive analytic tasks from the cloud to the edge to reduce transmission latency...",
      date: "December 2025",
    },
  ];
}
