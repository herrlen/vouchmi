// src/lib/store.ts
import { create } from "zustand";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import * as api from "./api";
import { registerUnauthHandler } from "./api";
import type { User, Community, Post, Msg } from "./api";

// Shared Keychain options so the Share Extension can read the auth token
const KEYCHAIN_OPTS: SecureStore.SecureStoreOptions | undefined = Platform.OS === "ios"
  ? { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK, keychainService: "group.com.vouchmi.app" }
  : undefined;

interface AuthState {
  user: User | null;
  isLoading: boolean;
  init: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (
    email: string,
    password: string,
    username: string,
    acceptTerms: boolean,
    extras?: { role?: "user" | "influencer" | "brand"; phone?: string }
  ) => Promise<void>;
  logout: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  init: async () => {
    // On any 401 from the API, wipe session + bounce to /auth. Avoids
    // a cascade of "Unauthenticated" alerts when a stale token hits protected endpoints.
    registerUnauthHandler(() => {
      SecureStore.deleteItemAsync("token", KEYCHAIN_OPTS).catch(() => {});
      set({ user: null });
      try { router.replace("/auth"); } catch {}
    });
    const token = await SecureStore.getItemAsync("token", KEYCHAIN_OPTS);
    if (token) {
      try {
        const { user } = await api.auth.me();
        set({ user, isLoading: false });
      } catch {
        await SecureStore.deleteItemAsync("token", KEYCHAIN_OPTS);
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
  login: async (email, password) => {
    const { user, token } = await api.auth.login(email, password);
    await SecureStore.setItemAsync("token", token, KEYCHAIN_OPTS);
    set({ user });
  },
  register: async (email, password, username, acceptTerms, extras) => {
    const { user, token } = await api.auth.register({
      email,
      username,
      password,
      accept_terms: acceptTerms,
      ...(extras?.role ? { role: extras.role } : {}),
      ...(extras?.phone ? { phone: extras.phone } : {}),
    });
    await SecureStore.setItemAsync("token", token, KEYCHAIN_OPTS);
    set({ user });
  },
  logout: async () => {
    try { await api.auth.logout(); } catch {}
    await SecureStore.deleteItemAsync("token", KEYCHAIN_OPTS);
    set({ user: null });
  },
}));

interface AppState {
  communities: Community[];
  feed: Post[];
  messages: Msg[];
  polling: ReturnType<typeof setInterval> | null;
  loadCommunities: () => Promise<void>;
  loadFeed: (cid: string) => Promise<void>;
  createPost: (cid: string, content: string, linkUrl?: string) => Promise<void>;
  likePost: (pid: string) => Promise<void>;
  loadMessages: (cid: string) => Promise<void>;
  sendMessage: (cid: string, content: string) => Promise<void>;
  startPolling: (cid: string) => void;
  stopPolling: () => void;
}

export const useApp = create<AppState>((set, get) => ({
  communities: [],
  feed: [],
  messages: [],
  polling: null,

  loadCommunities: async () => {
    const { communities } = await api.communities.mine();
    set({ communities });
  },
  loadFeed: async (cid) => {
    const { data } = await api.feed.list(cid);
    set({ feed: data });
  },
  createPost: async (cid, content, linkUrl) => {
    await api.feed.create(cid, { content, link_url: linkUrl });
    get().loadFeed(cid);
  },
  likePost: async (pid) => {
    const { like_count } = await api.feed.like(pid);
    set((s) => ({ feed: s.feed.map((p) => (p.id === pid ? { ...p, like_count } : p)) }));
  },
  loadMessages: async (cid) => {
    const { messages } = await api.chat.messages(cid);
    set({ messages });
  },
  sendMessage: async (cid, content) => {
    const { message } = await api.chat.send(cid, content);
    set((s) => ({ messages: [...s.messages, message] }));
  },
  startPolling: (cid) => {
    get().stopPolling();
    get().loadMessages(cid);
    const interval = setInterval(async () => {
      const msgs = get().messages;
      const last = msgs[msgs.length - 1];
      if (last) {
        try {
          const { messages: n } = await api.chat.messages(cid, last.created_at);
          if (n.length > 0) set((s) => ({ messages: [...s.messages, ...n] }));
        } catch {}
      }
    }, 3000);
    set({ polling: interval });
  },
  stopPolling: () => {
    const i = get().polling;
    if (i) clearInterval(i);
    set({ polling: null });
  },
}));
