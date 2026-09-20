import { type JSX, type ReactNode, useEffect, useMemo } from "react"

import { useWatch } from "react-hook-form"
import { useTranslations } from "use-intl"

import { LOCALES } from "~/src/integrations/use-intl/i18n.config"

import {
  type ProductAttributeAllowedValue,
  type ProductAttributeLocaleCode,
  type ProductAttributeLocaleMap,
} from "~/src/modules/product-attribute/product-attribute.types"
import { localeFillMap } from "~/src/modules/product-attribute/product-attribute.utils"

import { useAttributeFormLocaleControls } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-controls"
import { isCommittedAllowedValueRow } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale.utils"
import { useAttributeForm } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider"
import { CatalogLocalePickerLayout } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"

const allowedValueLocaleFillMap = (allowedValues: readonly ProductAttributeAllowedValue[]): Record<ProductAttributeLocaleCode, boolean> => {
  const committedRows = allowedValues.filter((entry) => isCommittedAllowedValueRow(entry))

  if (committedRows.length === 0) {
    return Object.fromEntries(LOCALES.map((locale) => [locale, true]))
  }

  return Object.fromEntries(LOCALES.map((locale) => [locale, committedRows.every((entry) => entry.labels[locale].trim() !== "")]))
}

const attributeFormLocaleFillMap = (
  titles: ProductAttributeLocaleMap | undefined,
  allowedValues: readonly ProductAttributeAllowedValue[],
): Record<ProductAttributeLocaleCode, boolean> => {
  const titleFills = localeFillMap(titles)
  const optionFills = allowedValueLocaleFillMap(allowedValues)

  return Object.fromEntries(LOCALES.map((locale) => [locale, titleFills[locale] && optionFills[locale]]))
}

export const AttributeFormLocaleLayout = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const tAttributes = useTranslations("pages.admin.catalog.attributes")
  const { control } = useAttributeForm()
  const { activeLocale, clearLocaleSubmitError, incompleteLocales, localeSubmitError, setActiveLocale } = useAttributeFormLocaleControls()
  const titles = useWatch({ control, name: "titles" })
  const allowedValues = useWatch({ control, name: "allowedValues" })
  const fills = useMemo(() => attributeFormLocaleFillMap(titles, allowedValues), [allowedValues, titles])

  useEffect(() => {
    if (localeSubmitError && LOCALES.every((locale) => fills[locale])) {
      clearLocaleSubmitError()
    }
  }, [clearLocaleSubmitError, fills, localeSubmitError])

  return (
    <CatalogLocalePickerLayout
      activeLocale={activeLocale}
      filledCountHint={tAttributes("form.localePicker.filledCountHint")}
      fills={fills}
      incompleteLocales={incompleteLocales}
      onLocaleChange={setActiveLocale}
      showSubmitError={localeSubmitError && incompleteLocales.length > 0}
    >
      {children}
    </CatalogLocalePickerLayout>
  )
}
