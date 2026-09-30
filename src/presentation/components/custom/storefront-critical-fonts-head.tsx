import { type JSX } from "react"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import criticalFontsCss from "~/src/presentation/styles/critical-fonts.css?raw"

import { getCriticalFontPreloads } from "~/src/presentation/document-assets"

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
  locale: SupportedLocale
}
