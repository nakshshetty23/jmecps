import { z } from "zod";

// Client-side only: registration and login call supabase-js directly from
// the browser (see src/app/(auth)/register/page.tsx, login/page.tsx) —
// there's no server action in front of signInWithOtp/verifyOtp to attach
// server-side Zod validation to. These schemas are the actual gate before
// those calls fire, not just a UX nicety.
export const registerInfoSchema = z.object({
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
});

export type RegisterInfoInput = z.infer<typeof registerInfoSchema>;

export const emailSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
});

export type EmailInput = z.infer<typeof emailSchema>;

// Supabase emails a 6-digit numeric code for both signup and login OTP.
export const otpSchema = z.object({
  token: z
    .string()
    .trim()
    .length(6, "Enter the 6-digit code")
    .regex(/^\d{6}$/, "The code must be 6 digits"),
});

export type OtpInput = z.infer<typeof otpSchema>;
