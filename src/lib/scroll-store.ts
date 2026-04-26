import { create } from "zustand";

interface ScrollStore {
  scrollToPostId: string | null;
  setScrollToPostId: (id: string | null) => void;
  scrollToTopReco: number;
  triggerScrollToTopReco: () => void;
  scrollToTopCommunities: number;
  triggerScrollToTopCommunities: () => void;
  scrollToTopProfile: number;
  triggerScrollToTopProfile: () => void;
}

export const useScrollStore = create<ScrollStore>((set) => ({
  scrollToPostId: null,
  setScrollToPostId: (id) => set({ scrollToPostId: id }),
  scrollToTopReco: 0,
  triggerScrollToTopReco: () => set((s) => ({ scrollToTopReco: s.scrollToTopReco + 1 })),
  scrollToTopCommunities: 0,
  triggerScrollToTopCommunities: () => set((s) => ({ scrollToTopCommunities: s.scrollToTopCommunities + 1 })),
  scrollToTopProfile: 0,
  triggerScrollToTopProfile: () => set((s) => ({ scrollToTopProfile: s.scrollToTopProfile + 1 })),
}));
