"use client";

import { type JSX, type ReactNode } from "react";

import { ClientThemeProvider as WrkszThemeProvider } from "@wrksz/themes/client";

import { THEME_STORAGE_KEY } from "~/src/lib/theme-init-script";

const THEMES = ["light", "dark"];

export interface ThemesProviderProps {
  readonly children: ReactNode;
}

export function ThemesProvider({ children }: ThemesProviderProps): JSX.Element {
  return (
    <WrkszThemeProvider
      attribute="class"
      enableSystem={false}
      themes={THEMES}
      defaultTheme="light"
      storage="localStorage"
      storageKey={THEME_STORAGE_KEY}
      disableTransitionOnChange
    >
      {children}
    </WrkszThemeProvider>
  );
}
