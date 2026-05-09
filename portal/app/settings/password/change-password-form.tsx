"use client";

import { useActionState, useEffect, useRef } from "react";
import { FormFieldError } from "@/components/forms/form-field-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { initialActionState } from "@/lib/action-state";
import { changePasswordAction } from "./actions";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, initialActionState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form ref={formRef} action={formAction} className="max-w-sm space-y-4">
      <div>
        <Label htmlFor="current_password">Aktuelles Passwort</Label>
        <Input
          id="current_password"
          name="current_password"
          type="password"
          autoComplete="current-password"
          required
          className="mt-1.5"
        />
        <FormFieldError message={state.fieldErrors?.current_password} />
      </div>

      <div>
        <Label htmlFor="password">Neues Passwort</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
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
          minLength={8}
          required
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

      {state.status === "success" && (
        <div
          className="rounded-md border border-success/30 bg-success/10 px-3 py-2 text-sm"
          role="status"
        >
          {state.message}
        </div>
      )}

      <SubmitButton>Speichern</SubmitButton>
    </form>
  );
}
