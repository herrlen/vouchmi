"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { VerifyResult } from "./actions";

const APP_SCHEME = "vouchmi://";

export default function VerifyResultClient({ result }: { result: VerifyResult }) {
  const isSuccess = result.status === "success";
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!isSuccess) return;
    const t = setTimeout(() => {
      setTried(true);
      window.location.href = APP_SCHEME;
    }, 400);
    return () => clearTimeout(t);
  }, [isSuccess]);

  return (
    <div className="text-center">
      <h1 className="mb-2 font-display text-2xl">
        {isSuccess ? "E-Mail bestätigt" : "Bestätigung fehlgeschlagen"}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">{result.message}</p>

      {isSuccess ? (
        <div className="flex flex-col items-center gap-3">
          <a
            href={APP_SCHEME}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
          >
            In Vouchmi-App öffnen
          </a>
          {tried && (
            <p className="max-w-xs text-xs text-muted-foreground">
              App öffnet sich nicht? Prüfe, ob Vouchmi installiert ist, oder nutze den Web-Login.
            </p>
          )}
          <Link
            href="/login"
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Stattdessen im Web anmelden
          </Link>
        </div>
      ) : (
        <Link
          href="/login"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Zum Login
        </Link>
      )}
    </div>
  );
}
