"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { FormFieldError } from "@/components/forms/form-field-error";
import { SubmitButton } from "@/components/forms/submit-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { initialActionState } from "@/lib/action-state";
import { registerAction } from "./actions";

const roles = [
  {
    value: "user",
    label: "Community-Mitglied",
    description: "Ich möchte Posts entdecken und Communities beitreten.",
  },
  {
    value: "influencer",
    label: "Creator",
    description: "Ich möchte Empfehlungen teilen und reichweitenstarke Communities aufbauen.",
  },
  {
    value: "brand",
    label: "Brand",
    description: "Ich repräsentiere eine Marke und möchte Drops & Seeding nutzen.",
  },
] as const;

export function RegisterForm() {
  const [state, formAction] = useActionState(registerAction, initialActionState);
  const [role, setRole] = useState<(typeof roles)[number]["value"]>("user");

  return (
    <form action={formAction} className="space-y-5">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Ich bin …</legend>
        <div className="space-y-2">
          {roles.map((r) => (
            <label
              key={r.value}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border border-border p-3 transition hover:border-primary/40",
                role === r.value && "border-primary bg-primary/5",
              )}
            >
              <input
                type="radio"
                name="role"
                value={r.value}
                checked={role === r.value}
                onChange={() => setRole(r.value)}
                className="mt-1 accent-primary"
              />
              <div>
                <div className="text-sm font-medium">{r.label}</div>
                <div className="text-xs text-muted-foreground">{r.description}</div>
              </div>
            </label>
          ))}
        </div>
        <FormFieldError message={state.fieldErrors?.role} />
      </fieldset>

      <div>
        <Label htmlFor="email">E-Mail</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required className="mt-1.5" />
        <FormFieldError message={state.fieldErrors?.email} />
      </div>

      <div>
        <Label htmlFor="username">Benutzername</Label>
        <Input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          minLength={3}
          maxLength={30}
          className="mt-1.5"
        />
        <p className="mt-1 text-xs text-muted-foreground">
          3–30 Zeichen · Buchstaben, Zahlen, _ und -
        </p>
        <FormFieldError message={state.fieldErrors?.username} />
      </div>

      <div>
        <Label htmlFor="display_name">Anzeigename (optional)</Label>
        <Input
          id="display_name"
          name="display_name"
          type="text"
          maxLength={50}
          className="mt-1.5"
        />
        <FormFieldError message={state.fieldErrors?.display_name} />
      </div>

      <div>
        <Label htmlFor="password">Passwort</Label>
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

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="accept_terms"
          required
          className="mt-1 h-4 w-4 accent-primary"
        />
        <span className="text-muted-foreground">
          Ich akzeptiere die{" "}
          <a
            href="https://vouchmi.com/agb.html"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-4"
          >
            AGB
          </a>{" "}
          und die{" "}
          <a
            href="https://vouchmi.com/datenschutz.html"
            target="_blank"
            rel="noreferrer"
            className="text-foreground underline underline-offset-4"
          >
            Datenschutzerklärung
          </a>
          .
        </span>
      </label>
      <FormFieldError message={state.fieldErrors?.accept_terms} />

      {state.status === "error" && state.message && !state.fieldErrors && (
        <div
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          role="alert"
        >
          {state.message}
        </div>
      )}

      <SubmitButton className="w-full">Konto erstellen</SubmitButton>

      <p className="text-center text-sm text-muted-foreground">
        Schon ein Konto?{" "}
        <Link href="/login" className="text-foreground underline underline-offset-4">
          Anmelden
        </Link>
      </p>
    </form>
  );
}
