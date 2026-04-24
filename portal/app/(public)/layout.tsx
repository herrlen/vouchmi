import Link from "next/link";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-screen-xl items-center justify-between px-6">
          <Link href="/" className="font-display text-2xl tracking-tight">
            Vouchmi
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <Link href="/login" className="text-muted-foreground hover:text-foreground">
              Anmelden
            </Link>
            <Link
              href="/register"
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary-hover"
            >
              Beitreten
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-xl px-6 py-10">{children}</main>
    </div>
  );
}
