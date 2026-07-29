import { z } from "zod";

// JMECPS's own subject areas (Mechanical, Electronics, Cyber-Physical
// Systems) — not the generic Computer Science/Medicine/Physics/Humanities
// example set, which doesn't fit this journal.
export const SUBJECT_CATEGORIES = [
  "MECHANICAL_ENGINEERING",
  "ELECTRONICS_ENGINEERING",
  "CYBER_PHYSICAL_SYSTEMS",
  "ROBOTICS_AUTOMATION",
  "INDUSTRIAL_ENGINEERING",
  "SMART_MANUFACTURING",
  "OTHER",
] as const;

export const SUBJECT_CATEGORY_LABELS: Record<(typeof SUBJECT_CATEGORIES)[number], string> = {
  MECHANICAL_ENGINEERING: "Mechanical Engineering",
  ELECTRONICS_ENGINEERING: "Electronics Engineering",
  CYBER_PHYSICAL_SYSTEMS: "Cyber-Physical Systems",
  ROBOTICS_AUTOMATION: "Robotics & Automation",
  INDUSTRIAL_ENGINEERING: "Industrial Engineering",
  SMART_MANUFACTURING: "Smart Manufacturing",
  OTHER: "Other",
};

const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

const draftAuthorSchema = z.object({
  firstName: z.string().max(100).optional().default(""),
  lastName: z.string().max(100).optional().default(""),
  email: z.string().email("Enter a valid email address").optional().or(z.literal("")),
  institution: z.string().max(200).optional().default(""),
  isCorresponding: z.boolean().optional().default(false),
  orcid: z
    .string()
    .regex(ORCID_RE, "ORCID must be in the format 0000-0000-0000-0000")
    .optional()
    .or(z.literal("")),
});

const submitAuthorSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().min(1, "Email is required").email("Enter a valid email address"),
  institution: z.string().min(1, "Institution is required").max(200),
  isCorresponding: z.boolean(),
  orcid: z
    .string()
    .regex(ORCID_RE, "ORCID must be in the format 0000-0000-0000-0000")
    .optional()
    .or(z.literal("")),
});

export const draftSchema = z.object({
  title: z.string().max(250, "Title must be 250 characters or fewer").optional().default(""),
  abstract: z
    .string()
    .refine((val) => countWords(val) <= 300, "Abstract must be 300 words or fewer")
    .optional()
    .default(""),
  keywords: z.array(z.string().min(1)).max(10, "Provide at most 10 keywords").optional().default([]),
  authors: z.array(draftAuthorSchema).optional().default([]),
  // The native <select>'s unselected option is value="" (not undefined) —
  // normalize that to "not chosen yet" rather than an invalid enum member.
  category: z.preprocess(
    (val) => (val === "" ? undefined : val),
    z.enum(SUBJECT_CATEGORIES).optional()
  ),
  references: z.array(z.string()).optional().default([]),
});

export const submitSchema = z.object({
  title: z.string().min(1, "Title is required").max(250, "Title must be 250 characters or fewer"),
  abstract: z
    .string()
    .min(1, "Abstract is required")
    .refine((val) => countWords(val) <= 300, "Abstract must be 300 words or fewer"),
  keywords: z
    .array(z.string().min(1))
    .min(3, "Provide at least 3 keywords")
    .max(10, "Provide at most 10 keywords"),
  authors: z
    .array(submitAuthorSchema)
    .min(1, "At least one author is required")
    .refine(
      (authors) => authors.filter((a) => a.isCorresponding).length === 1,
      "Exactly one author must be marked as the corresponding author"
    ),
  category: z.enum(SUBJECT_CATEGORIES, { message: "Select a subject category" }),
  references: z.array(z.string().min(1)).optional().default([]),
});

export type DraftInput = z.infer<typeof draftSchema>;
export type SubmitInput = z.infer<typeof submitSchema>;
export type AuthorInput = z.infer<typeof draftAuthorSchema>;
// Pre-default shape (fields optional) — what react-hook-form actually holds
// before draftSchema's .default()s apply. z.infer/DraftInput above is the
// POST-default output type, wrong for useForm's generic.
export type DraftFormValues = z.input<typeof draftSchema>;

export { countWords };
