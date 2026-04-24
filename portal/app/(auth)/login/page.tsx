import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmelden" };

export default function LoginPage() {
  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl">Willkommen zurück</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Melde dich mit deinem Vouchmi-Konto an.
        </p>
      </header>
      <LoginForm />
    </div>
  );
}
