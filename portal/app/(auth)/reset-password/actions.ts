"use server";

import { redirect } from "next/navigation";
import { api, ApiRequestError } from "@/lib/api";
import { type ActionState, zodFieldErrors } from "@/lib/action-state";
import { resetPasswordSchema } from "@/lib/schemas";
import { clearSessionToken } from "@/lib/session";

export async function resetPasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = resetPasswordSchema.safeParse({
    email: formData.get("email"),
    token: formData.get("token"),
    password: formData.get("password"),
    password_confirmation: formData.get("password_confirmation"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Bitte überprüfe deine Eingaben.",
      fieldErrors: zodFieldErrors(parsed.error.flatten()),
    };
  }

  try {
    await api<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      if (error.status === 422 && error.errors) {
        return {
          status: "error",
          message: "Zurücksetzen fehlgeschlagen.",
          fieldErrors: Object.fromEntries(
            Object.entries(error.errors).map(([k, v]) => [k, v[0] ?? ""]),
          ),
        };
      }
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Verbindung zum Server fehlgeschlagen." };
  }

  // Laravel invalidates all existing tokens on password reset; drop the
  // stale session cookie so the user lands on /login as unauthenticated.
  await clearSessionToken();

  redirect("/login?reset=success");
}
