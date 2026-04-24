"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormFieldError } from "@/components/forms/form-field-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";
import { resetPasswordAction } from "./actions";

export function ResetForm({ email, token }: { email: string; token: string }) {
  const [state, formAction] = useActionState(resetPasswordAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="email" value={email} />
      <input type="hidden" name="token" value={token} />

      <div>
        <Label htmlFor="password">Neues Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1.5"
        />
        <FormFieldError message={state.fieldErrors?.password} />
      </div>

      <div>
        <Label htmlFor="password_confirmation">Passwort bestätigen</Label>
        <Input
          id="password_confirmation"
          name="password_confirmation"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          className="mt-1.5"
        />
        <FormFieldError message={state.fieldErrors?.password_confirmation} />
      </div>

      {state.status === "error" && state.message && !state.fieldErrors && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </div>
      )}

      <SubmitButton className="w-full">Passwort speichern</SubmitButton>

      <Link
        href="/login"
        className="block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Zurück zum Login
      </Link>
    </form>
  );
}
