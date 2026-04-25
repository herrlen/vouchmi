import { create } from "zustand";

interface ScrollStore {
  scrollToPostId: string | null;
  setScrollToPostId: (id: string | null) => void;
  scrollToTopReco: number;
  triggerScrollToTopReco: () => void;
}

export const useScrollStore = create<ScrollStore>((set) => ({
  scrollToPostId: null,
  setScrollToPostId: (id) => set({ scrollToPostId: id }),
  scrollToTopReco: 0,
  triggerScrollToTopReco: () => set((s) => ({ scrollToTopReco: s.scrollToTopReco + 1 })),
}));
