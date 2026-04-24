"use server";

import { redirect } from "next/navigation";
import { api, ApiRequestError } from "@/lib/api";
import { type ActionState, zodFieldErrors } from "@/lib/action-state";
import { registerSchema } from "@/lib/schemas";
import { setSessionToken } from "@/lib/session";
import type { AuthResponse } from "@/lib/types";

export async function registerAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = registerSchema.safeParse({
    email: formData.get("email"),
    username: formData.get("username"),
    password: formData.get("password"),
    display_name: formData.get("display_name") ?? "",
    role: formData.get("role") ?? "user",
    accept_terms: formData.get("accept_terms"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Bitte überprüfe deine Eingaben.",
      fieldErrors: zodFieldErrors(parsed.error.flatten()),
    };
  }

  const payload = {
    email: parsed.data.email,
    username: parsed.data.username,
    password: parsed.data.password,
    display_name: parsed.data.display_name || undefined,
    role: parsed.data.role,
    accept_terms: true,
  };

  let auth: AuthResponse;
  try {
    auth = await api<AuthResponse>("/api/auth/register", {
      method: "POST",
      body: payload,
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      if (error.status === 422 && error.errors) {
        return {
          status: "error",
          message: "Registrierung fehlgeschlagen.",
          fieldErrors: Object.fromEntries(
            Object.entries(error.errors).map(([k, v]) => [k, v[0] ?? ""]),
          ),
        };
      }
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Verbindung zum Server fehlgeschlagen." };
  }

  await setSessionToken(auth.token);
  redirect("/verify-email-pending");
}
