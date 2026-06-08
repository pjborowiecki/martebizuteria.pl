import type { JSX } from "react";

import { CRITICAL_FONTS_INLINE_CSS, getCriticalFontPreloads } from "~/src/constants/_constants/critical-fonts";
import type { Locale } from "~/src/constants/types";

const CRITICAL_FONTS_STYLE_HTML = { __html: CRITICAL_FONTS_INLINE_CSS };

interface StorefrontCriticalFontsHeadProps {
  locale: Locale;
}

/**
 * Inlines @font-face + metric fallbacks and preloads locale-critical subsets
 * before TanStack route styles (SSR-safe, no extra stylesheet round trip).
 */
export function StorefrontCriticalFontsHead({ locale }: Readonly<StorefrontCriticalFontsHeadProps>): JSX.Element {
  return (
    <>
      {getCriticalFontPreloads(locale).map((link) => (
        <link key={link.href} {...link} />
      ))}
      <style dangerouslySetInnerHTML={CRITICAL_FONTS_STYLE_HTML} />
    </>
  );
}
