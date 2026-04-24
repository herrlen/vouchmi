import type { Metadata } from "next";
import { resendVerificationAction } from "./actions";
import { SubmitButton } from "@/components/forms/submit-button";

export const metadata: Metadata = { title: "E-Mail bestätigen" };

export default function VerifyEmailPendingPage() {
  return (
    <div className="space-y-6 text-center">
      <div>
        <h1 className="mb-2 font-display text-2xl">Fast geschafft!</h1>
        <p className="text-sm text-muted-foreground">
          Wir haben dir einen Bestätigungs-Link per E-Mail geschickt. Klicke auf den Link,
          um dein Konto zu aktivieren.
        </p>
      </div>

      <form action={resendVerificationAction}>
        <SubmitButton>Link erneut senden</SubmitButton>
      </form>

      <div className="border-t border-border pt-4">
        <p className="mb-2 text-xs text-muted-foreground">
          Falsche E-Mail-Adresse oder anders anmelden?
        </p>
        <form action="/logout" method="post">
          <button
            type="submit"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Abmelden
          </button>
        </form>
      </div>
    </div>
  );
}
