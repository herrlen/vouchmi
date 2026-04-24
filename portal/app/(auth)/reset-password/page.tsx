import type { Metadata } from "next";
import Link from "next/link";
import { ResetForm } from "./reset-form";

export const metadata: Metadata = { title: "Passwort zurücksetzen" };

type Props = {
  searchParams: Promise<{ email?: string; token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <div>
        <header className="mb-6">
          <h1 className="font-display text-2xl">Ungültiger Link</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Der Reset-Link ist unvollständig. Bitte fordere einen neuen Link an.
          </p>
        </header>
        <Link
          href="/forgot-password"
          className="block text-center text-sm underline underline-offset-4"
        >
          Neuen Link anfordern
        </Link>
      </div>
    );
  }

  return (
    <div>
      <header className="mb-6">
        <h1 className="font-display text-2xl">Neues Passwort wählen</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Für <strong className="text-foreground">{email}</strong>.
        </p>
      </header>
      <ResetForm email={email} token={token} />
    </div>
  );
}
