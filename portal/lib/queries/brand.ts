import "server-only";
import { apiMaybe } from "@/lib/api";
import type { BrandProfile, SponsoredDrop } from "@/lib/types";

export type ReachPoint = { date: string; reach: number };

export type BrandOverview = {
  activeDrops: number;
  reach7d: number;
  taggedPosts: number;
  affiliateClicks: number;
  reachSeries: ReachPoint[];
  recentDrops: SponsoredDrop[];
};

/**
 * Brand overview aggregation. The backend does not yet expose a single
 * overview endpoint — we fan out to the endpoints that exist today and
 * degrade gracefully for the ones still on the TODO list.
 * See BACKEND-TODO.md for the endpoints this would collapse into.
 */
export async function getBrandOverview(): Promise<BrandOverview> {
  const [drops, clicks, mentions] = await Promise.all([
    apiMaybe<{ drops: SponsoredDrop[] }>("/api/brand/drops", { cache: "no-store" }),
    apiMaybe<{ total: number; series: ReachPoint[] }>("/api/brand/analytics/clicks", {
      cache: "no-store",
    }),
    apiMaybe<{ total: number }>("/api/brand/analytics/mentions", { cache: "no-store" }),
  ]);

  const dropList = drops?.drops ?? [];

  return {
    activeDrops: dropList.filter((d) => d.status === "live").length,
    reach7d: clicks?.series?.slice(-7).reduce((sum, p) => sum + p.reach, 0) ?? 0,
    taggedPosts: mentions?.total ?? 0,
    affiliateClicks: clicks?.total ?? 0,
    reachSeries: clicks?.series ?? [],
    recentDrops: dropList.slice(0, 5),
  };
}

export async function getBrandProfile(): Promise<BrandProfile | null> {
  return apiMaybe<BrandProfile>("/api/brand/profile", { cache: "no-store" });
}

export async function getBrandDrops(): Promise<SponsoredDrop[]> {
  const data = await apiMaybe<{ drops: SponsoredDrop[] }>("/api/brand/drops", {
    cache: "no-store",
  });
  return data?.drops ?? [];
}
