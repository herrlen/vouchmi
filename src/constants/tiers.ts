export type Tier = "none" | "bronze" | "silver" | "gold";

export const TIER_CONFIG: Record<Tier, { label: string; color: string; emoji: string; followers: number; recommendations: number }> = {
  none:   { label: "User",   color: "#94A3B8", emoji: "",   followers: 0,      recommendations: 0 },
  bronze: { label: "Bronze", color: "#CD7F32", emoji: "🥉", followers: 1000,   recommendations: 25 },
  silver: { label: "Silber", color: "#C0C0C0", emoji: "🥈", followers: 10000,  recommendations: 200 },
  gold:   { label: "Gold",   color: "#FFD700", emoji: "🥇", followers: 100000, recommendations: 1000 },
};

export const TIER_ORDER: Tier[] = ["none", "bronze", "silver", "gold"];

export function getNextTier(tier: Tier): Tier | null {
  const idx = TIER_ORDER.indexOf(tier);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}
