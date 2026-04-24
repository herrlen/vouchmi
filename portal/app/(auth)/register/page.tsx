import type { Metadata } from "next";
import { RegisterForm } from "./register-form";

export const metadata: Metadata = { title: "Registrieren" };

export default function RegisterPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl">Konto erstellen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Starte auf Vouchmi — Community Commerce für dich und deine Marke.
        </p>
      </header>
      <RegisterForm />
    </div>
  );
}
