import { redirect } from "next/navigation";
import { fetchCurrentUser } from "@/lib/queries/auth";
import { roleHome } from "@/lib/role-home";
import type { AuthUser, UserRole } from "@/lib/types";

export async function requireRole(role: UserRole): Promise<AuthUser> {
  const user = await fetchCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== role) redirect(roleHome(user.role));
  return user;
}

/**
 * Like requireRole but accepts any authenticated user regardless of role.
 * Useful for cross-role surfaces like the Wallet, where every user can
 * top up credits to boost their own recommendations.
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await fetchCurrentUser();
  if (!user) redirect("/login");
  return user;
}
