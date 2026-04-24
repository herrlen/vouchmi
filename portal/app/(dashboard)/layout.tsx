import { redirect } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";
import { fetchCurrentUser } from "@/lib/queries/auth";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await fetchCurrentUser();
  if (!user) redirect("/login");
  if (!user.email_verified_at) redirect("/verify-email-pending");

  return (
    <div className="flex min-h-screen">
      <Sidebar role={user.role} />
      <div className="flex min-h-screen flex-1 flex-col">
        <TopNav user={user} />
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="mx-auto max-w-screen-xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
