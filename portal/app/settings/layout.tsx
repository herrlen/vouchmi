import { redirect } from "next/navigation";
import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";
import { fetchCurrentUser } from "@/lib/queries/auth";

const tabs = [
  { href: "/settings", label: "Profil" },
  { href: "/settings/password", label: "Passwort" },
  { href: "/settings/notifications", label: "Benachrichtigungen" },
  { href: "/settings/privacy", label: "Datenschutz" },
];

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const user = await fetchCurrentUser();
  if (!user) redirect("/login");

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav user={user} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-screen-lg space-y-6">
            <h1 className="font-display text-3xl">Einstellungen</h1>
            <nav className="flex gap-1 border-b border-border">
              {tabs.map((t) => (
                <Link
                  key={t.href}
                  href={t.href}
                  className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
                >
                  {t.label}
                </Link>
              ))}
            </nav>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
