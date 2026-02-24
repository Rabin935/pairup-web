"use client";

import type { ReactNode } from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";

export default function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider
      attribute="class"
      themes={["light", "dark", "system"]}
      defaultTheme="system"
      enableSystem
      storageKey="pairup-theme"
      enableColorScheme
    >
      {children}
    </NextThemesProvider>
  );
}
