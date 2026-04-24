"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormFieldError } from "@/components/forms/form-field-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";
import { loginAction } from "./actions";

export function LoginForm() {
  const [state, formAction] = useActionState(loginAction, initialActionState);

  return (
    <form action={formAction} className="space-y-5">
      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="mt-1.5"
        />
        <FormFieldError message={state.fieldErrors?.email} />
      </div>

      <div>
        <div className="flex items-baseline justify-between">
          <Label htmlFor="password">Passwort</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            Vergessen?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5"
        />
        <FormFieldError message={state.fieldErrors?.password} />
      </div>

      {state.status === "error" && state.message && !state.fieldErrors && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </div>
      )}

      <SubmitButton className="w-full">Anmelden</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Noch kein Konto?{" "}
        <Link href="/register" className="text-foreground underline underline-offset-4">
          Registrieren
        </Link>
      </p>
    </form>
  );
}
