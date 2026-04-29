"use client";

import { useEffect } from "react";

import { useTheme } from "@/lib/store";

export function ThemeSync() {
  const theme = useTheme((s) => s.theme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);
  return null;
}
