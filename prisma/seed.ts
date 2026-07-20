import "dotenv/config";
import { createHash } from "node:crypto";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const SEED_PASSWORD = "ChangeMe123!";

function fakeFileHash(seedLabel: string) {
  return createHash("sha256").update(`jmecps-seed:${seedLabel}`).digest("hex");
}

async function main() {
  // Idempotent: safe to re-run without a full `prisma migrate reset`.
  await prisma.payment.deleteMany();
  await prisma.manuscript.deleteMany();
  await prisma.user.deleteMany();

  const password_hash = await bcrypt.hash(SEED_PASSWORD, 10);

  const superAdmin = await prisma.user.create({
    data: {
      full_name: "Priya Natarajan",
      email: "priya.natarajan@example.edu",
      password_hash,
      institutional_affiliation: "JMECPS Editorial Office",
      role: "SUPER_ADMIN",
      email_verified: true,
    },
  });

  const [adminOne, adminTwo] = await Promise.all([
    prisma.user.create({
      data: {
        full_name: "Marcus Whitfield",
        email: "marcus.whitfield@example.edu",
        password_hash,
        institutional_affiliation: "Department of Mechanical Engineering, Fictional State University",
        role: "ADMIN",
        email_verified: true,
      },
    }),
    prisma.user.create({
      data: {
        full_name: "Aiko Tanaka",
        email: "aiko.tanaka@example.edu",
        password_hash,
        institutional_affiliation: "School of Electronics and Cyber Systems, Meridian Institute of Technology",
        role: "ADMIN",
        email_verified: true,
      },
    }),
  ]);

  const [researcherOne, researcherTwo, researcherThree] = await Promise.all([
    prisma.user.create({
      data: {
        full_name: "Diego Alvarez",
        email: "diego.alvarez@example.edu",
        password_hash,
        institutional_affiliation: "Department of Robotics, Northbridge University",
        role: "RESEARCHER",
        email_verified: true,
      },
    }),
    prisma.user.create({
      data: {
        full_name: "Fatima Al-Rashid",
        email: "fatima.alrashid@example.edu",
        password_hash,
        institutional_affiliation: "Institute of Cyber-Physical Systems, Al-Farabi Polytechnic",
        role: "RESEARCHER",
        email_verified: false,
      },
    }),
    prisma.user.create({
      data: {
        full_name: "Liam O'Connell",
        email: "liam.oconnell@example.edu",
        password_hash,
        institutional_affiliation: "Faculty of Industrial Engineering, Dunmore College",
        role: "RESEARCHER",
        email_verified: true,
      },
    }),
  ]);

  const manuscriptDraft = await prisma.manuscript.create({
    data: {
      title: "Adaptive Control Strategies for Modular Robotic Arms",
      abstract:
        "This draft explores adaptive control approaches for modular robotic arms operating in unstructured environments, with preliminary simulation results.",
      keywords: ["robotics", "adaptive control", "modular systems"],
      primary_author_id: researcherOne.id,
      co_authors: [
        { name: "Sana Idris", affiliation: "Northbridge University", email: "sana.idris@example.edu" },
      ],
      institution: "Northbridge University",
      subject_category: "Robotics & Automation",
      references: [{ citation: "Alvarez, D. (2025). Notes on modular actuation. Internal working paper." }],
      file_url: "https://jmecps-manuscripts.example-storage.com/seed/draft-adaptive-control.pdf",
      file_hash: fakeFileHash("draft-adaptive-control"),
      sit_conference_flag: false,
      status: "DRAFT",
    },
  });

  const manuscriptSubmitted = await prisma.manuscript.create({
    data: {
      title: "A Lightweight Intrusion Detection Model for Industrial IoT Networks",
      abstract:
        "We propose a lightweight intrusion detection model tailored to constrained industrial IoT devices, evaluated against three public network-traffic datasets.",
      keywords: ["cyber-physical systems", "intrusion detection", "industrial IoT"],
      primary_author_id: researcherTwo.id,
      co_authors: [
        { name: "Youssef Haddad", affiliation: "Al-Farabi Polytechnic", email: "youssef.haddad@example.edu" },
        { name: "Elena Petrova", affiliation: "Al-Farabi Polytechnic", email: "elena.petrova@example.edu" },
      ],
      institution: "Al-Farabi Polytechnic",
      subject_category: "Cyber-Physical Systems Security",
      references: [
        { citation: "Petrova, E., & Haddad, Y. (2024). Traffic profiling at the edge. Journal of Fictional Networks, 12(3), 45-58." },
      ],
      file_url: "https://jmecps-manuscripts.example-storage.com/seed/submitted-iiot-ids.pdf",
      file_hash: fakeFileHash("submitted-iiot-ids"),
      sit_conference_flag: true,
      status: "SUBMITTED",
    },
  });

  const manuscriptUnderReview = await prisma.manuscript.create({
    data: {
      title: "Predictive Maintenance Scheduling Using Sparse Sensor Data",
      abstract:
        "This paper presents a predictive maintenance scheduling method that remains accurate under sparse and irregularly sampled sensor data, validated on a simulated manufacturing line.",
      keywords: ["predictive maintenance", "sensor fusion", "manufacturing"],
      primary_author_id: researcherThree.id,
      co_authors: [
        { name: "Grace Muthoni", affiliation: "Dunmore College", email: "grace.muthoni@example.edu" },
      ],
      institution: "Dunmore College",
      subject_category: "Industrial Engineering",
      references: [
        { citation: "O'Connell, L. (2023). Sparse signals in maintenance forecasting. Proceedings of Fictional Industrial Systems Conference, 220-231." },
      ],
      file_url: "https://jmecps-manuscripts.example-storage.com/seed/under-review-predictive-maintenance.pdf",
      file_hash: fakeFileHash("under-review-predictive-maintenance"),
      sit_conference_flag: false,
      status: "UNDER_REVIEW",
    },
  });

  const manuscriptApproved = await prisma.manuscript.create({
    data: {
      title: "Energy-Aware Task Offloading in Edge-Enabled Manufacturing Systems",
      abstract:
        "We present an energy-aware task offloading scheme for edge-enabled manufacturing systems, demonstrating a measurable reduction in energy consumption without compromising latency requirements.",
      keywords: ["edge computing", "task offloading", "energy efficiency"],
      primary_author_id: researcherOne.id,
      co_authors: [
        { name: "Noor Habib", affiliation: "Northbridge University", email: "noor.habib@example.edu" },
      ],
      institution: "Northbridge University",
      subject_category: "Cyber-Physical Systems",
      references: [
        { citation: "Habib, N., & Alvarez, D. (2024). Offloading under energy budgets. Journal of Fictional Edge Computing, 8(1), 1-14." },
      ],
      file_url: "https://jmecps-manuscripts.example-storage.com/seed/approved-energy-aware-offloading.pdf",
      file_hash: fakeFileHash("approved-energy-aware-offloading"),
      sit_conference_flag: false,
      status: "APPROVED",
    },
  });

  const manuscriptPublished = await prisma.manuscript.create({
    data: {
      title: "A Survey of Digital Twin Techniques for Smart Manufacturing",
      abstract:
        "This survey reviews digital twin techniques applied to smart manufacturing, categorizing approaches by fidelity level and synchronization strategy across 40 reviewed works.",
      keywords: ["digital twin", "smart manufacturing", "survey"],
      primary_author_id: researcherTwo.id,
      co_authors: [
        { name: "Rui Chen", affiliation: "Al-Farabi Polytechnic", email: "rui.chen@example.edu" },
        { name: "Ingrid Larsen", affiliation: "Meridian Institute of Technology", email: "ingrid.larsen@example.edu" },
      ],
      institution: "Al-Farabi Polytechnic",
      subject_category: "Smart Manufacturing",
      references: [
        { citation: "Chen, R., Larsen, I., & Al-Rashid, F. (2023). Digital twins at scale. Journal of Fictional Manufacturing Systems, 15(2), 88-120." },
      ],
      file_url: "https://jmecps-manuscripts.example-storage.com/seed/published-digital-twin-survey.pdf",
      file_hash: fakeFileHash("published-digital-twin-survey"),
      sit_conference_flag: false,
      status: "PUBLISHED",
    },
  });

  await prisma.payment.create({
    data: {
      transaction_ref: "TXN-2026-000101",
      manuscript_id: manuscriptPublished.id,
      amount: "450.00",
      currency: "USD",
      gateway_log: {
        provider: "fictional-gateway",
        event: "checkout.session.completed",
        raw: { id: "evt_seed_0101", status: "succeeded" },
      },
      invoice_url: null, // invoice generation ships in Session 3.2
      status: "COMPLETED",
    },
  });

  await prisma.payment.create({
    data: {
      transaction_ref: "TXN-2026-000102",
      manuscript_id: manuscriptApproved.id,
      amount: "450.00",
      currency: "USD",
      gateway_log: {
        provider: "fictional-gateway",
        event: "checkout.session.created",
        raw: { id: "evt_seed_0102", status: "awaiting_payment" },
      },
      invoice_url: null,
      status: "PENDING",
    },
  });

  console.log("Seed complete:");
  console.log(`  Users: 1 super admin, 2 admins, 3 researchers (super admin id: ${superAdmin.id})`);
  console.log(
    `  Manuscripts: DRAFT ${manuscriptDraft.id}, SUBMITTED ${manuscriptSubmitted.id}, UNDER_REVIEW ${manuscriptUnderReview.id}, APPROVED ${manuscriptApproved.id}, PUBLISHED ${manuscriptPublished.id}`
  );
  console.log(`  Payments: 2 (linked to APPROVED and PUBLISHED manuscripts)`);
  console.log(`  Admins created: ${adminOne.email}, ${adminTwo.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
