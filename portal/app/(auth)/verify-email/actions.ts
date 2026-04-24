"use server";

import { api, ApiRequestError } from "@/lib/api";
import { verifyEmailSchema } from "@/lib/schemas";

export type VerifyResult =
  | { status: "success"; message: string }
  | { status: "error"; message: string };

export async function verifyEmailServerAction(
  email: string,
  token: string,
): Promise<VerifyResult> {
  const parsed = verifyEmailSchema.safeParse({ email, token });
  if (!parsed.success) {
    return { status: "error", message: "Link ist unvollständig oder ungültig." };
  }

  try {
    await api<{ message: string }>("/api/auth/verify-email", {
      method: "POST",
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return {
        status: "error",
        message: error.message || "Bestätigung fehlgeschlagen.",
      };
    }
    return { status: "error", message: "Verbindung zum Server fehlgeschlagen." };
  }

  return { status: "success", message: "Deine E-Mail-Adresse wurde erfolgreich bestätigt." };
}
