import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

const FONT_PRELOAD_BASE = {
  as: "font",
  crossOrigin: "anonymous",
  rel: "preload",
  type: "font/woff2",
} as const

const MANROPE_LATIN = { ...FONT_PRELOAD_BASE, href: "/fonts/manrope-latin-wght-normal.woff2" } as const

const MANROPE_LATIN_EXT = { ...FONT_PRELOAD_BASE, href: "/fonts/manrope-latin-ext-wght-normal.woff2" } as const

const CORMORANT_GARAMOND_LATIN = { ...FONT_PRELOAD_BASE, href: "/fonts/cormorant-garamond-latin-400-normal.woff2" } as const

const CORMORANT_GARAMOND_LATIN_EXT = { ...FONT_PRELOAD_BASE, href: "/fonts/cormorant-garamond-latin-ext-400-normal.woff2" } as const

export const LANDING_HERO_FONT_PRELOAD = { ...FONT_PRELOAD_BASE, href: "/fonts/cormorant-garamond-latin-400-italic.woff2" } as const

export const getCriticalFontPreloads = (locale: SupportedLocale) =>
  locale === "pl-PL"
    ? [MANROPE_LATIN, CORMORANT_GARAMOND_LATIN, MANROPE_LATIN_EXT, CORMORANT_GARAMOND_LATIN_EXT]
    : [MANROPE_LATIN, CORMORANT_GARAMOND_LATIN]
