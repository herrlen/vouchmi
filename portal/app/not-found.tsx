import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-muted-foreground">404</p>
        <h1 className="mt-2 font-display text-3xl">Seite nicht gefunden</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Die Seite, die du suchst, existiert nicht oder wurde verschoben.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-hover"
        >
          Zur Startseite
        </Link>
      </div>
    </main>
  );
}
