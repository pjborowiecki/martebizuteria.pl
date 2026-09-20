import { type JSX } from "react"

import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import criticalFontsCss from "~/src/presentation/styles/critical-fonts.css?raw"

import { getCriticalFontPreloads } from "~/src/presentation/document-assets"
/** Inline font faces and metric fallbacks before route CSS to avoid a stylesheet round trip. */
export const StorefrontCriticalFontsHead = ({ locale }: Readonly<StorefrontCriticalFontsHeadProps>): JSX.Element => (
  <>
    {getCriticalFontPreloads(locale).map((link) => (
      <link key={link.href} {...link} />
    ))}
    <style dangerouslySetInnerHTML={CRITICAL_FONTS_STYLE_HTML} />
  </>
)

const CRITICAL_FONTS_STYLE_HTML = {
  __html: criticalFontsCss,
}
interface StorefrontCriticalFontsHeadProps {
  locale: Locale
}
