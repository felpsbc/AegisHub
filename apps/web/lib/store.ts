"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

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
