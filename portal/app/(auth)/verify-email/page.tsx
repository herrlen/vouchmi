import type { Metadata } from "next";
import Link from "next/link";
import { verifyEmailServerAction } from "./actions";

export const metadata: Metadata = { title: "E-Mail bestätigen" };

type Props = {
  searchParams: Promise<{ email?: string; token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { email, token } = await searchParams;

  if (!email || !token) {
    return (
      <div className="text-center">
        <h1 className="mb-2 font-display text-2xl">Ungültiger Link</h1>
        <p className="text-sm text-muted-foreground">
          Der Bestätigungs-Link ist unvollständig.
        </p>
      </div>
    );
  }

  const result = await verifyEmailServerAction(email, token);

  return (
    <div className="text-center">
      <h1 className="mb-2 font-display text-2xl">
        {result.status === "success" ? "E-Mail bestätigt" : "Bestätigung fehlgeschlagen"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{result.message}</p>
      <Link
        href="/login"
        className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
      >
        Zum Login
      </Link>
    </div>
  );
}
