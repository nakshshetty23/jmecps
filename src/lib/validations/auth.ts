import { z } from "zod";

// Client-side only: registration calls supabase-js directly from the
// browser; login's password step goes through a Server Action (see
// src/lib/actions/auth-login.ts) specifically so the password grant's
// session never reaches the browser before the OTP step is verified — but
// the shape of what's valid to submit is still gated here first.
// Entropy floor, not a full strength meter: at least 8 characters with a
// letter and a number, so "password" and "12345678" alone are rejected
// without demanding symbols this journal's non-technical author base
// would find punishing. Shared by registerSchema and newPasswordSchema
// (password reset) — a single source of truth so the two flows can never
// silently drift into different policies.
const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long")
  .regex(/[A-Za-z]/, "Password must include at least one letter")
  .regex(/[0-9]/, "Password must include at least one number");

export const registerSchema = z
  .object({
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
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const loginCredentialsSchema = z.object({
  email: z.string().trim().min(1, "Email is required").email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginCredentialsInput = z.infer<typeof loginCredentialsSchema>;

export const requestPasswordResetSchema = z.object({
  email: loginCredentialsSchema.shape.email,
});

export type RequestPasswordResetInput = z.infer<typeof requestPasswordResetSchema>;

// Same password rule as registration (passwordSchema above) — a password
// reset must not be held to a weaker or differently-worded policy than
// signup.
export const newPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type NewPasswordInput = z.infer<typeof newPasswordSchema>;

// The "already my current email" check needs the actual authenticated
// email, which only the server knows — this schema only validates shape,
// same division of labor as requestPasswordResetSchema.
export const changeEmailSchema = z.object({
  newEmail: loginCredentialsSchema.shape.email,
});

export type ChangeEmailInput = z.infer<typeof changeEmailSchema>;

// Supabase emails an 8-digit numeric code for both signup and login OTP.
export const otpSchema = z.object({
  token: z
    .string()
    .trim()
    .length(8, "Enter the 8-digit code")
    .regex(/^\d{8}$/, "The code must be 8 digits"),
});

export type OtpInput = z.infer<typeof otpSchema>;
