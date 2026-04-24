import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/queries/auth";
import { roleHome } from "@/lib/role-home";

export default async function RootPage() {
  const user = await fetchCurrentUser();
  if (!user) redirect("/login");
  if (!user.email_verified_at) redirect("/verify-email-pending");
  redirect(roleHome(user.role));
}
