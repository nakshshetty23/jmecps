import { z } from "zod";

// Client-side only: registration and login call supabase-js directly from
// the browser (see src/app/(auth)/register/page.tsx, login/page.tsx) —
// there's no server action in front of signUp/signInWithPassword to attach
// server-side Zod validation to. This schema is the actual gate before
// those calls fire, not just a UX nicety.
export const registerSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .max(120, "Full name is too long"),
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  institutionalAffiliation: z
    .string()
    .trim()
    .min(2, "Institutional affiliation must be at least 2 characters")
    .max(200, "Institutional affiliation is too long"),
  // Entropy floor, not a full strength meter: at least 8 characters with a
  // letter and a number, so "password" and "12345678" alone are rejected
  // without demanding symbols this journal's non-technical author base
  // would find punishing.
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password is too long")
    .regex(/[A-Za-z]/, "Password must include at least one letter")
    .regex(/[0-9]/, "Password must include at least one number"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;
