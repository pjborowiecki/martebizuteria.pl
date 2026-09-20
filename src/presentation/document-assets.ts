import { type Locale } from "~/src/integrations/use-intl/i18n.types"
/** One sans + one serif preload for the active locale subset (avoids bandwidth contention). */
export const getCriticalFontPreloads = (locale: Locale) => {
  const useLatinExt = locale === "pl"
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
