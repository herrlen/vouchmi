"use server";

import { redirect } from "next/navigation";
import { api, ApiRequestError } from "@/lib/api";
import { type ActionState, zodFieldErrors } from "@/lib/action-state";
import { roleHome } from "@/lib/role-home";
import { loginSchema } from "@/lib/schemas";
import { setSessionToken } from "@/lib/session";
import type { AuthResponse } from "@/lib/types";

export async function loginAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Bitte überprüfe deine Eingaben.",
      fieldErrors: zodFieldErrors(parsed.error.flatten()),
    };
  }

  let auth: AuthResponse;
  try {
    auth = await api<AuthResponse>("/api/auth/login", {
      method: "POST",
      body: parsed.data,
    });
  } catch (error) {
    if (error instanceof ApiRequestError) {
      if (error.status === 422 && error.errors) {
        return {
          status: "error",
          message: "Anmeldung fehlgeschlagen.",
          fieldErrors: Object.fromEntries(
            Object.entries(error.errors).map(([k, v]) => [k, v[0] ?? ""]),
          ),
        };
      }
      return {
        status: "error",
        message:
          error.status === 401
            ? "E-Mail oder Passwort ist nicht korrekt."
            : error.message,
      };
    }
    return { status: "error", message: "Verbindung zum Server fehlgeschlagen." };
  }

  await setSessionToken(auth.token);

  if (!auth.user.email_verified_at) {
    redirect("/verify-email-pending");
  }
  redirect(roleHome(auth.user.role));
}
