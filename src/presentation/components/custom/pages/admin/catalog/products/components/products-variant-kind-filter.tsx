import { type JSX, useCallback, useMemo } from "react"

import { Layers } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { PRODUCT_VARIANT_KIND, type ProductVariantKind } from "~/src/modules/product/product.constants"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { useProductsDataGridContext } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid"

const parseVariantKindFilter = (value: string): ProductVariantKind | undefined => {
  if (value === PRODUCT_VARIANT_KIND.SINGLE || value === PRODUCT_VARIANT_KIND.MULTI) {
    return value
  }

  return undefined
}

export const ProductsVariantKindFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const { activeVariantKindFilter, applyProductsFilter } = useProductsDataGridContext()
  const current = activeVariantKindFilter ?? ALL_VALUE
  const options = useMemo(
    () => [
      {
        label: t("filter.allVariantKinds"),
        value: ALL_VALUE,
      },
      {
        label: t("variantKind.single"),
        value: PRODUCT_VARIANT_KIND.SINGLE,
      },
      {
        label: t("variantKind.multi"),
        value: PRODUCT_VARIANT_KIND.MULTI,
      },
    ],
    [t],
  )

  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return
      }
      applyProductsFilter({
        variantKind: value === ALL_VALUE ? undefined : parseVariantKindFilter(value),
      })
    },
    [applyProductsFilter],
  )

  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="h-9 w-[220px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" aria-label={t("filter.variantKind")}>
        <Layers className="size-3.5 text-muted-foreground/60" strokeWidth={1.5} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const ALL_VALUE = "all"
