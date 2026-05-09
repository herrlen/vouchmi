"use server";

import { api, ApiRequestError } from "@/lib/api";
import { type ActionState, zodFieldErrors } from "@/lib/action-state";
import { changePasswordSchema } from "@/lib/schemas";

export async function changePasswordAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = changePasswordSchema.safeParse({
    current_password: formData.get("current_password"),
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
    await api<{ message: string }>("/api/auth/change-password", {
      method: "POST",
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      if (error.status === 422 && error.errors) {
        return {
          status: "error",
          message: "Passwort konnte nicht geändert werden.",
          fieldErrors: Object.fromEntries(
            Object.entries(error.errors).map(([k, v]) => [k, v[0] ?? ""]),
          ),
        };
      }
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Verbindung zum Server fehlgeschlagen." };
  }

  return {
    status: "success",
    message: "Passwort erfolgreich geändert. Andere aktive Sitzungen wurden abgemeldet.",
  };
}
