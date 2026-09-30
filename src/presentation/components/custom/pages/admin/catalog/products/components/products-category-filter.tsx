import { type JSX, useCallback, useMemo } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { ListFilter } from "lucide-react"
import { useLocale, useTranslations } from "use-intl/react"

import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { getAdminCategoriesQuery } from "~/src/modules/product-category/use-cases/get-admin-categories"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

import { useProductsDataGridContext } from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-data-grid"

export const ProductsCategoryFilter = (): JSX.Element => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const locale = useLocale()
  const { activeCategoryFilter, applyProductsFilter } = useProductsDataGridContext()
  const { data: categories } = useSuspenseQuery(getAdminCategoriesQuery())
  const current = activeCategoryFilter ?? ALL_VALUE
  const options = useMemo(
    () => [
      {
        label: t("filter.allCategories"),
        value: ALL_VALUE,
      },
      ...categories.map((category) => ({
        label: resolveCategoryTitle(category.titles, locale),
        value: category.id,
      })),
    ],
    [categories, locale, t],
  )

  const handleChange = useCallback(
    (value: string | null) => {
      if (value === null) {
        return
      }
      applyProductsFilter({
        categoryId: value === ALL_VALUE ? undefined : value,
      })
    },
    [applyProductsFilter],
  )

  return (
    <Select items={options} value={current} onValueChange={handleChange}>
      <SelectTrigger size="sm" className="h-9 w-[200px] gap-2 rounded-lg text-xs data-[size=sm]:h-9" aria-label={t("filter.category")}>
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
