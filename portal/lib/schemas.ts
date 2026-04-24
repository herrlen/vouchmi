import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Bitte gib eine gültige E-Mail-Adresse ein."),
  password: z.string().min(1, "Passwort erforderlich."),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  email: z.string().email("Bitte gib eine gültige E-Mail-Adresse ein."),
  username: z
    .string()
    .min(3, "Mindestens 3 Zeichen.")
    .max(30, "Höchstens 30 Zeichen.")
    .regex(/^[a-zA-Z0-9_-]+$/, "Nur Buchstaben, Zahlen, _ und - erlaubt."),
  password: z.string().min(8, "Mindestens 8 Zeichen."),
  display_name: z.string().max(50).optional().or(z.literal("")),
  role: z.enum(["user", "influencer", "brand"]),
  accept_terms: z.literal("on", { message: "Bitte akzeptiere die AGB." }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Bitte gib eine gültige E-Mail-Adresse ein."),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    email: z.string().email(),
    token: z.string().min(32, "Ungültiger Link."),
    password: z.string().min(8, "Mindestens 8 Zeichen."),
    password_confirmation: z.string().min(8),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: "Passwörter stimmen nicht überein.",
    path: ["password_confirmation"],
  });
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const verifyEmailSchema = z.object({
  email: z.string().email(),
  token: z.string().min(32),
});
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
