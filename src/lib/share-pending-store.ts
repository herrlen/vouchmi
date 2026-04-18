import { create } from "zustand";

interface SharePendingState {
  pendingUrl: string | null;
  setPendingUrl: (url: string | null) => void;
  clear: () => void;
}

export const useSharePending = create<SharePendingState>((set) => ({
  pendingUrl: null,
  setPendingUrl: (url) => set({ pendingUrl: url }),
  clear: () => set({ pendingUrl: null }),
}));
