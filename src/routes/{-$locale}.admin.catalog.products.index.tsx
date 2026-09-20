import { type JSX } from "react"

import { type QueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { adminProductAttributesQueryOptions } from "~/src/modules/product-attribute/use-cases/get-admin-product-attributes"
import { adminCategoriesQueryOptions } from "~/src/modules/product-category/use-cases/get-admin-categories"
import { adminCollectionsQueryOptions } from "~/src/modules/product-collection/use-cases/get-admin-collections"
import { PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"
import { adminProductsQueryOptions } from "~/src/modules/product/use-cases/get-admin-products"
import { productStatsQueryOptions } from "~/src/modules/product/use-cases/get-product-stats"

import { ProductsTableContent } from "~/src/presentation/components/custom/pages/admin/catalog/products/components/products-table"
import {
  ProductsSheetProvider,
  useProductsSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/products/hooks/use-products-sheet"
const prefetchProductsQueries = async (context: { queryClient: QueryClient }): Promise<void> => {
  await Promise.all([
    context.queryClient.query({
      ...adminProductsQueryOptions(),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...productStatsQueryOptions(),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...adminCategoriesQueryOptions(),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...adminCollectionsQueryOptions(),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...adminProductAttributesQueryOptions(),
      staleTime: "static",
    }),
  ])
}
const ProductsIndexRoute = (): JSX.Element => {
  const sheetState = useProductsSheetState()
  return (
    <ProductsSheetProvider value={sheetState}>
      <ProductsTableContent />
    </ProductsSheetProvider>
  )
}
export const Route = createFileRoute("/{-$locale}/admin/catalog/products/")({
  component: ProductsIndexRoute,
  loader: ({ context }) => prefetchProductsQueries(context),
  shouldReload: false,
  staleTime: PRODUCT_QUERY_STALE_MS,
})
