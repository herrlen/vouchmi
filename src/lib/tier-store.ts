import { create } from "zustand";
import { tier as tierApi, type TierStatus, type TierProgress } from "./api";

type Tier = "none" | "bronze" | "silver" | "gold";

interface TierStore {
  tier: Tier;
  badgeOpacity: number;
  followerCount: number;
  recommendationCount: number;
  nextTier: Tier | null;
  progressToNext: { followers: TierProgress; recommendations: TierProgress } | null;
  eligibleForUpgrade: boolean;
  loaded: boolean;
  fetchTierStatus: () => Promise<void>;
  dismissUpgradePrompt: () => Promise<void>;
}

export const useTierStore = create<TierStore>((set) => ({
  tier: "none",
  badgeOpacity: 1,
  followerCount: 0,
  recommendationCount: 0,
  nextTier: null,
  progressToNext: null,
  eligibleForUpgrade: false,
  loaded: false,

  fetchTierStatus: async () => {
    try {
      const s = await tierApi.status();
      set({
        tier: s.tier,
        badgeOpacity: s.badge_opacity,
        followerCount: s.follower_count,
        recommendationCount: s.recommendation_count,
        nextTier: s.next_tier as Tier | null,
        progressToNext: s.progress_to_next,
        eligibleForUpgrade: s.eligible_for_upgrade,
        loaded: true,
      });
    } catch {
      set({ loaded: true });
    }
  },

  dismissUpgradePrompt: async () => {
    try {
      await tierApi.dismissUpgrade();
      set({ eligibleForUpgrade: false });
    } catch {}
  },
}));
