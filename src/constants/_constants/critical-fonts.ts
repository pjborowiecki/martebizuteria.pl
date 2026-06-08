import type { Locale } from "~/src/constants/types";

/**
 * Metric-adjusted fallbacks (Capsize) minimize layout shift when webfonts swap in.
 * @see https://web.dev/articles/optimize-webfont-loading
 */
const FONT_FALLBACK_FACE_CSS = `
@font-face {
  font-family: "Manrope Fallback";
  src: local("Arial");
  size-adjust: 98.16%;
  ascent-override: 106.6%;
  descent-override: 30%;
  line-gap-override: 0%;
}
@font-face {
  font-family: "Cormorant Garamond Fallback";
  src: local("Times New Roman");
  size-adjust: 46.09%;
  ascent-override: 92.4%;
  descent-override: 28.7%;
  line-gap-override: 0%;
}
`;

/** Above-the-fold faces inlined in <head> so preloads apply before bundled CSS. */
const CRITICAL_FONT_FACE_RULES_CSS = `
@font-face {
  font-family: "Cormorant Garamond";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/cormorant-garamond-latin-400-normal.woff2") format("woff2");
  unicode-range:
    U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122,
    U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: "Cormorant Garamond";
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  src: url("/fonts/cormorant-garamond-latin-ext-400-normal.woff2") format("woff2");
  unicode-range:
    U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
@font-face {
  font-family: "Manrope";
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url("/fonts/manrope-latin-wght-normal.woff2") format("woff2-variations");
  unicode-range:
    U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+2074, U+20AC, U+2122,
    U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}
@font-face {
  font-family: "Manrope";
  font-style: normal;
  font-weight: 200 800;
  font-display: swap;
  src: url("/fonts/manrope-latin-ext-wght-normal.woff2") format("woff2-variations");
  unicode-range:
    U+0100-02AF, U+0304, U+0308, U+0329, U+1E00-1E9F, U+1EF2-1EFF, U+2020, U+20A0-20AB, U+20AD-20CF, U+2113, U+2C60-2C7F, U+A720-A7FF;
}
`;

const CRITICAL_FONT_VARIABLES_CSS = `
:root {
  --font-sans: "Manrope", "Manrope Fallback", system-ui, sans-serif;
  --font-serif: "Cormorant Garamond", "Cormorant Garamond Fallback", "Times New Roman", serif;
}
`;

export const CRITICAL_FONTS_INLINE_CSS = `${FONT_FALLBACK_FACE_CSS}${CRITICAL_FONT_FACE_RULES_CSS}${CRITICAL_FONT_VARIABLES_CSS}`;

const FONT_PRELOAD_BASE = {
  as: "font",
  crossOrigin: "anonymous",
  rel: "preload",
  type: "font/woff2"
} as const;

/** One sans + one serif preload for the active locale subset (avoids bandwidth contention). */
export function getCriticalFontPreloads(locale: Locale) {
  const useLatinExt = locale === "pl";

  return [
    {
      ...FONT_PRELOAD_BASE,
      href: useLatinExt ? "/fonts/manrope-latin-ext-wght-normal.woff2" : "/fonts/manrope-latin-wght-normal.woff2"
    },
    {
      ...FONT_PRELOAD_BASE,
      href: useLatinExt ? "/fonts/cormorant-garamond-latin-ext-400-normal.woff2" : "/fonts/cormorant-garamond-latin-400-normal.woff2"
    }
  ] as const;
}
