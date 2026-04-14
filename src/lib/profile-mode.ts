import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { brand, type BrandStatus } from "./api";

export type ProfileMode = "personal" | "brand";
const STORAGE_KEY = "active_profile_mode";

interface ProfileModeState {
  mode: ProfileMode;
  status: BrandStatus | null;
  loading: boolean;
  init: () => Promise<void>;
  refresh: () => Promise<void>;
  setMode: (mode: ProfileMode) => Promise<void>;
  reset: () => Promise<void>;
}

/**
 * Verwaltet den aktiven Profil-Modus (Personal ↔ Brand).
 * Der Modus wird in SecureStore gespeichert und beim App-Start geladen.
 * Wechsel zu "brand" ist nur möglich, wenn der Nutzer ein aktives Brand-Abo hat.
 */
export const useProfileMode = create<ProfileModeState>((set, get) => ({
  mode: "personal",
  status: null,
  loading: true,

  init: async () => {
    const stored = (await SecureStore.getItemAsync(STORAGE_KEY)) as ProfileMode | null;
    await get().refresh();
    const status = get().status;
    const canBrand = !!status?.is_active;
    const initial = stored === "brand" && canBrand ? "brand" : "personal";
    set({ mode: initial, loading: false });
  },

  refresh: async () => {
    try {
      const status = await brand.status();
      set({ status });
      // Falls das Brand-Abo verloren ging, zurück auf personal schalten.
      if (!status.is_active && get().mode === "brand") {
        set({ mode: "personal" });
        await SecureStore.setItemAsync(STORAGE_KEY, "personal");
      }
    } catch {
      set({ status: null });
    }
  },

  setMode: async (mode) => {
    const status = get().status;
    if (mode === "brand" && !status?.is_active) return;
    await SecureStore.setItemAsync(STORAGE_KEY, mode);
    set({ mode });
  },

  reset: async () => {
    await SecureStore.deleteItemAsync(STORAGE_KEY);
    set({ mode: "personal", status: null });
  },
}));
