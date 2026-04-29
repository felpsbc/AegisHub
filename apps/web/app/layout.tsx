import "@/styles/globals.css";

import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { ThemeScript } from "@/components/ThemeScript";
import { ThemeSync } from "@/components/ThemeSync";
import { ToastHost } from "@/components/Toast";

import { Providers } from "./providers";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "AegisHub — Marketplace B2B de pentest",
  description:
    "Conecte sua empresa a pentesters verificados, com escopo fechado, escrow e relatório cifrado.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-dvh">
        <Providers>
          <ThemeSync />
          {children}
          <ToastHost />
        </Providers>
      </body>
    </html>
  );
}
