"use server";

import { api } from "@/lib/api";

export async function resendVerificationAction(): Promise<void> {
  try {
    await api<{ message: string }>("/api/auth/send-verification", { method: "POST" });
  } catch {
    // swallow — button is one-way UI; user sees link again or refreshes
  }
}
