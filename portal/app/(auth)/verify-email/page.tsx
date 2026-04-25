import type { Metadata } from "next";
import { verifyEmailServerAction } from "./actions";
import VerifyResultClient from "./VerifyResultClient";

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

  return <VerifyResultClient result={result} />;
}
