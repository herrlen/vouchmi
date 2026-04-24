import type { Metadata } from "next";
import { ForgotForm } from "./forgot-form";

export const metadata: Metadata = { title: "Passwort vergessen" };

export default function ForgotPasswordPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl">Passwort vergessen?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gib deine E-Mail-Adresse ein. Wir schicken dir einen Link zum Zurücksetzen.
        </p>
      </header>
      <ForgotForm />
    </div>
  );
}
