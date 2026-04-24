"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormFieldError } from "@/components/forms/form-field-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";
import { forgotPasswordAction } from "./actions";

export function ForgotForm() {
  const [state, formAction] = useActionState(forgotPasswordAction, initialActionState);

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <div
          className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm"
          role="status"
        >
          {state.message}
        </div>
        <Link
          href="/login"
          className="block text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Zurück zum Login
        </Link>
      </div>
    );
  }

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

      {state.status === "error" && state.message && !state.fieldErrors && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </div>
      )}

      <SubmitButton className="w-full">Reset-Link senden</SubmitButton>

      <Link
        href="/login"
        className="block text-center text-sm text-muted-foreground hover:text-foreground"
      >
        Zurück zum Login
      </Link>
    </form>
  );
}
