import type { Metadata } from "next";
import { resendVerificationAction } from "./actions";
import { SubmitButton } from "@/components/forms/submit-button";

export const metadata: Metadata = { title: "E-Mail bestätigen" };

export default function VerifyEmailPendingPage() {
  return (
    <div className="text-center">
      <h1 className="mb-2 font-display text-2xl">Fast geschafft!</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Wir haben dir einen Bestätigungs-Link per E-Mail geschickt. Klicke auf den Link,
        um dein Konto zu aktivieren.
      </p>
      <form action={resendVerificationAction}>
        <SubmitButton>Link erneut senden</SubmitButton>
      </form>
    </div>
  );
}
