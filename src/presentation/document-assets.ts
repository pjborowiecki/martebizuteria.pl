import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export const getCriticalFontPreloads = (locale: SupportedLocale) => {
  const useLatinExt = locale === "pl-PL"

  return [
    {
      ...FONT_PRELOAD_BASE,
      href: useLatinExt ? "/fonts/manrope-latin-ext-wght-normal.woff2" : "/fonts/manrope-latin-wght-normal.woff2",
    },
    {
      ...FONT_PRELOAD_BASE,
      href: useLatinExt ? "/fonts/cormorant-garamond-latin-ext-400-normal.woff2" : "/fonts/cormorant-garamond-latin-400-normal.woff2",
    },
  ] as const
}

const FONT_PRELOAD_BASE = {
  as: "font",
  crossOrigin: "anonymous",
  rel: "preload",
  type: "font/woff2",
} as const
