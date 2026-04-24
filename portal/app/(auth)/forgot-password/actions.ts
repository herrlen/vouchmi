"use server";

import { api, ApiRequestError } from "@/lib/api";
import { type ActionState, zodFieldErrors } from "@/lib/action-state";
import { forgotPasswordSchema } from "@/lib/schemas";

export async function forgotPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Bitte überprüfe deine Eingabe.",
      fieldErrors: zodFieldErrors(parsed.error.flatten()),
    };
  }

  try {
    await api<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Verbindung zum Server fehlgeschlagen." };
  }

  return {
    status: "success",
    message:
      "Falls ein Konto mit dieser E-Mail existiert, findest du einen Link zum Zurücksetzen in deinem Postfach.",
  };
}
