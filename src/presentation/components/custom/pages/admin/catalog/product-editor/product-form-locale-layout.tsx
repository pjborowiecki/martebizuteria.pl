import { type JSX, type ReactNode, useEffect, useMemo } from "react"

import { useFormContext, useWatch } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { localeFillMap } from "~/src/modules/product-attribute/product-attribute.utils"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { useCatalogFormLocaleControls } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"
import { CatalogLocalePickerLayout } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"

export const ProductFormLocaleLayout = ({
  children,
}: Readonly<{
  children: ReactNode
}>): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products")
  const { control } = useFormContext<ProductFormValues>()
  const { activeLocale, clearLocaleSubmitError, incompleteLocales, localeSubmitError, setActiveLocale } = useCatalogFormLocaleControls()
  const titles = useWatch({
    control,
    name: "titles",
  })

  const fills = useMemo(() => localeFillMap(titles), [titles])
  useEffect(() => {
    if (localeSubmitError && fills["pl-PL"] && fills["en-US"]) {
      clearLocaleSubmitError()
    }
  }, [clearLocaleSubmitError, fills, localeSubmitError])

  return (
    <CatalogLocalePickerLayout
      activeLocale={activeLocale}
      filledCountHint={t("form.localePicker.filledCountHint")}
      fills={fills}
      incompleteLocales={incompleteLocales}
      onLocaleChange={setActiveLocale}
      showSubmitError={localeSubmitError && incompleteLocales.length > 0}
    >
      {children}
    </CatalogLocalePickerLayout>
  )
}
