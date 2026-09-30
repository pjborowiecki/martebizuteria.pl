import { useMemo } from "react"

import { type useTranslations } from "use-intl/react"

import { type CatalogLocaleFieldsCopy } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-fields"

type Translator = ReturnType<typeof useTranslations>

const localeFieldCopy = (t: Translator, field: string): CatalogLocaleFieldsCopy => ({
  hint: (locale) => t(`form.hints.${field}Locale.${locale}`),
  label: (locale) => t(`form.${field}Locale.${locale}`),
  placeholder: (locale) => t(`form.${field}LocalePlaceholder.${locale}`),
})

export const useProductEditorBasicCopy = (
  t: Translator,
): Readonly<{
  descriptionCopy: CatalogLocaleFieldsCopy
  subtitleCopy: CatalogLocaleFieldsCopy
  titleCopy: CatalogLocaleFieldsCopy
}> =>
  useMemo(
    () => ({
      descriptionCopy: localeFieldCopy(t, "description"),
      subtitleCopy: localeFieldCopy(t, "subtitle"),
      titleCopy: localeFieldCopy(t, "title"),
    }),
    [t],
  )
