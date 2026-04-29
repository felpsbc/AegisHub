"use client";

import { useEffect } from "react";

import { useToast } from "@/lib/store";

export function ToastHost() {
  const { message, clear } = useToast();

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(clear, 2200);
    return () => window.clearTimeout(id);
  }, [message, clear]);

  if (!message) return null;
  return <div className="toast">{message}</div>;
}
