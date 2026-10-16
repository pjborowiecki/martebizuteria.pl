import { useMemo } from "react"

import { useQuery } from "@tanstack/react-query"
import { useLocale, useTranslations } from "use-intl/react"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import { resolveCategoryTitle } from "~/src/modules/product-category/product-category.utils"
import { getAdminCategoriesQuery } from "~/src/modules/product-category/use-cases/get-admin-categories"
import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import { getAdminCollectionsQuery } from "~/src/modules/product-collection/use-cases/get-admin-collections"
import { PRODUCT_STATUS_LABEL_KEYS, type ProductInventoryLevel } from "~/src/modules/product/product.constants"
import { type Product } from "~/src/modules/product/product.types"
import { exportAdminProducts } from "~/src/modules/product/use-cases/export-admin-products"

import { useFormatLocale } from "~/src/hooks/use-display-format"

import {
  type DataGridExportSource,
  describeAmountFilter,
  describeDateFilter,
  exportFilter,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-export"
import { useAdminDateFilterDay } from "~/src/presentation/components/custom/pages/admin/lib/use-admin-date-filter-day"

export const PRODUCTS_EXPORT_LIST = "products"

const INVENTORY_LEVEL_LABEL_KEYS: Readonly<Record<ProductInventoryLevel, string>> = {
  low: "stockLow",
  ok: "stockOk",
  out: "stockOut",
}

const useCatalogFilterTitles = ({ categoryId, collectionId }: Product["adminProductsExportInput"]): CatalogFilterTitles => {
  const locale = useLocale()
  const { data: categories } = useQuery({ ...getAdminCategoriesQuery(), enabled: categoryId !== undefined })
  const { data: collections } = useQuery({ ...getAdminCollectionsQuery(), enabled: collectionId !== undefined })
  const category = categories?.find(({ id }) => id === categoryId)
  const collection = collections?.find(({ id }) => id === collectionId)

  return {
    category: category === undefined ? categoryId : resolveCategoryTitle(category.titles, locale),
    collection: collection === undefined ? collectionId : resolveCollectionTitle(collection.titles, locale),
  }
}

export const useProductsExportSource = (
  input: Product["adminProductsExportInput"],
  loadsFromServer: boolean,
): DataGridExportSource<Product["adminListItem"]> => {
  const t = useTranslations("pages.admin.catalog.products.catalogList")
  const tGrid = useTranslations("components.datagrid")
  const formatLocale = useFormatLocale()
  const { formatIsoDateLabel } = useAdminDateFilterDay()
  const titles = useCatalogFilterTitles(input)

  return useMemo(() => {
    const formatMoney = (amount: number): string => formatPrice(amount, STORE_CURRENCY_CODE, formatLocale)
    const formatCount = (count: number): string => new Intl.NumberFormat(formatLocale).format(count)

    return {
      filters: [
        ...exportFilter(t("columns.categories"), titles.category),
        ...exportFilter(t("columns.collections"), titles.collection),
        ...exportFilter(t("columns.status"), input.status === undefined ? undefined : t(PRODUCT_STATUS_LABEL_KEYS[input.status])),
        ...exportFilter(t("columns.variants"), input.variantKind === undefined ? undefined : t(`variantKind.${input.variantKind}`)),
        ...exportFilter(
          t("filter.inventoryLevel"),
          input.inventoryLevel === undefined ? undefined : t(INVENTORY_LEVEL_LABEL_KEYS[input.inventoryLevel]),
        ),
        ...exportFilter(
          t("columns.price"),
          input.minPrice === undefined ? undefined : describeAmountFilter(input.minPrice, formatMoney, tGrid),
        ),
        ...exportFilter(
          t("columns.stock"),
          input.totalStock === undefined ? undefined : describeAmountFilter(input.totalStock, formatCount, tGrid),
        ),
        ...exportFilter(
          t("columns.createdAt"),
          input.createdAt === undefined ? undefined : describeDateFilter(input.createdAt, formatIsoDateLabel, tGrid),
        ),
      ],
      list: PRODUCTS_EXPORT_LIST,
      loadRows: loadsFromServer ? () => exportAdminProducts({ data: input }) : undefined,
      search: input.search,
      title: t("title"),
    }
  }, [formatIsoDateLabel, formatLocale, input, loadsFromServer, t, tGrid, titles.category, titles.collection])
}

interface CatalogFilterTitles {
  readonly category: string | undefined
  readonly collection: string | undefined
}
