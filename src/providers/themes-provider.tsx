"use client"

import { type JSX, type ReactNode } from "react"

import { ClientThemeProvider as WrkszThemeProvider } from "@wrksz/themes/client"

import { THEME_STORAGE_KEY } from "~/src/presentation/theme/theme-init"
export const ThemesProvider = ({ children }: ThemesProviderProps): JSX.Element => (
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
)

const THEMES = ["light", "dark"]
export interface ThemesProviderProps {
  readonly children: ReactNode
}
