import { create } from "zustand";

interface ScrollStore {
  scrollToPostId: string | null;
  setScrollToPostId: (id: string | null) => void;
}

export const useScrollStore = create<ScrollStore>((set) => ({
  scrollToPostId: null,
  setScrollToPostId: (id) => set({ scrollToPostId: id }),
}));
