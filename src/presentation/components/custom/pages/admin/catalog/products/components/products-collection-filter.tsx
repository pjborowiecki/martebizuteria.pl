import { type JSX, useCallback, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { ListFilter } from "lucide-react"
import { useLocale, useTranslations } from "use-intl"

import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import { adminCollectionsQueryOptions } from "~/src/modules/product-collection/use-cases/get-admin-collections"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { useProductsDataGridContext } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid"
export const ProductsCollectionFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const locale = useLocale()
  const { activeCollectionFilter, applyProductsFilter } = useProductsDataGridContext()
  const { data: collections } = useSuspenseQuery(adminCollectionsQueryOptions())
  const current = activeCollectionFilter ?? ALL_VALUE
  const options = useMemo(
    () => [
      {
        label: t("filter.allCollections"),
        value: ALL_VALUE,
      },
      ...collections.map((collection) => ({
        label: resolveCollectionTitle(collection.titles, locale),
        value: collection.id,
      })),
    ],
    [collections, locale, t],
  )
  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return
      }
      applyProductsFilter({
        collectionId: value === ALL_VALUE ? undefined : value,
      })
    },
    [applyProductsFilter],
  )
  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="h-9 w-[200px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" aria-label={t("filter.collection")}>
        <ListFilter className="size-3.5 text-muted-foreground/60" strokeWidth={1.5} />
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
