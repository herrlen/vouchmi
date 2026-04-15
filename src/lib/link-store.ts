import { create } from "zustand";
import { links as linksApi, type SharedLink, type LinkStats } from "./api";

interface LinkStore {
  items: SharedLink[];
  loading: boolean;
  createLink: (url: string, communityId?: string) => Promise<SharedLink>;
  fetchLinks: () => Promise<void>;
  fetchStats: (id: string) => Promise<LinkStats>;
  removeLink: (id: string) => Promise<void>;
}

export const useLinkStore = create<LinkStore>((set, get) => ({
  items: [],
  loading: false,

  createLink: async (url, communityId) => {
    const link = await linksApi.create({ url, community_id: communityId });
    set((s) => ({ items: [link, ...s.items] }));
    return link;
  },

  fetchLinks: async () => {
    set({ loading: true });
    try {
      const res = await linksApi.list();
      set({ items: res.data });
    } finally {
      set({ loading: false });
    }
  },

  fetchStats: async (id) => linksApi.stats(id),

  removeLink: async (id) => {
    await linksApi.destroy(id);
    set((s) => ({ items: s.items.filter((l) => l.id !== id) }));
  },
}));
