import { type FieldErrors } from "react-hook-form"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ContentPage } from "~/src/modules/content-page/content-page.types"

const LOCALIZED_FIELDS = ["titles", "descriptions", "bodies"] as const

export const CONTENT_PAGE_FORM_ID = "content-page-form"

export const conflictToastId = (handle: string): string => `content-page-conflict-${handle}`

export const localesWithErrors = (errors: FieldErrors<ContentPage["formValues"]>): SupportedLocale[] =>
  I18N.SUPPORTED_LOCALES.filter((locale) => LOCALIZED_FIELDS.some((field) => errors[field]?.[locale] !== undefined))

export const toContentPageFormValues = (page: ContentPage["select"]): ContentPage["formValues"] => ({
  bodies: page.bodies,
  descriptions: page.descriptions,
  expectedUpdatedAt: page.updatedAt,
  titles: page.titles,
})

export const editsMadeSince = (submitted: ContentPage["formValues"], current: ContentPage["formValues"]): readonly LocalizedEdit[] =>
  LOCALIZED_FIELDS.flatMap((field) =>
    I18N.SUPPORTED_LOCALES.flatMap((locale) =>
      current[field][locale] === submitted[field][locale] ? [] : [{ field, locale, value: current[field][locale] }],
    ),
  )

interface LocalizedEdit {
  readonly field: (typeof LOCALIZED_FIELDS)[number]
  readonly locale: SupportedLocale
  readonly value: string
}
