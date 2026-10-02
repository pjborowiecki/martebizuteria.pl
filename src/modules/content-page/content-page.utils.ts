import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { isSupportedLocale } from "~/src/integrations/use-intl/i18n.paths"

import { CONTENT_PAGE_HANDLES, type ContentPageHandle } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"

export const isContentPageHandle = (value: string): value is ContentPageHandle =>
  (CONTENT_PAGE_HANDLES as readonly string[]).includes(value)

export const reviseChangedLocales = (
  current: Pick<ContentPage["select"], "bodies" | "revisedAts" | "titles">,
  next: Pick<ContentPage["select"], "bodies" | "titles">,
): ContentPage["revisionMap"] => {
  const now = Date.now()

  return Object.fromEntries(
    I18N.SUPPORTED_LOCALES.map((locale) => [
      locale,
      current.titles[locale] === next.titles[locale] && current.bodies[locale] === next.bodies[locale] ? current.revisedAts[locale] : now,
    ]),
  )
}

export const revisionDateFor = (revisedAts: ContentPage["revisionMap"], locale: string): Date =>
  new Date(revisedAts[isSupportedLocale(locale) ? locale : I18N.DEFAULT_LOCALE])
