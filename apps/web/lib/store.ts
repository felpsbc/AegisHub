"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type Account = "empresa" | "pentester" | "admin";

type AuthState = {
  account: Account | null;
  hydrated: boolean;
  setAccount: (account: Account | null) => void;
  logout: () => void;
  setHydrated: () => void;
};

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      account: null,
      hydrated: false,
      setAccount: (account) => set({ account }),
      logout: () => set({ account: null }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: "aegishub.auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ account: state.account }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);

type Theme = "light" | "dark";

type ThemeState = {
  theme: Theme;
  toggle: () => void;
  set: (t: Theme) => void;
};

export const useTheme = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "light",
      toggle: () => set({ theme: get().theme === "dark" ? "light" : "dark" }),
      set: (t) => set({ theme: t }),
    }),
    {
      name: "aegishub.theme",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

type ToastState = {
  message: string | null;
  show: (msg: string) => void;
  clear: () => void;
};

export const useToast = create<ToastState>((set) => ({
  message: null,
  show: (message) => set({ message }),
  clear: () => set({ message: null }),
}));
