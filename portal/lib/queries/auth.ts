import "server-only";
import { apiMaybe } from "@/lib/api";
import type { AuthUser, MeResponse } from "@/lib/types";

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const data = await apiMaybe<MeResponse>("/api/auth/me", { cache: "no-store" });
  return data?.user ?? null;
}
