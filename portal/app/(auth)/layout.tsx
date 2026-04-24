import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-8 block text-center font-display text-3xl tracking-tight">
          Vouchmi
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-card)]">
          {children}
        </div>
      </div>
    </main>
  );
}
