"use client";

import { type JSX, type ReactNode } from "react";

import { ClientThemeProvider as WrkszThemeProvider } from "@wrksz/themes/client";

import { CONSTANTS } from "~/src/constants";

const THEME_STORAGE_KEY = `${CONSTANTS.APP_NAME}-theme`;
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
