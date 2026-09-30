import { type JSX } from "react"

import { type QueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { CATEGORY_QUERY_STALE_MS } from "~/src/modules/product-category/product-category.constants"
import { getAdminCategoriesQuery } from "~/src/modules/product-category/use-cases/get-admin-categories"
import { getCategoryStatsQuery } from "~/src/modules/product-category/use-cases/get-category-stats"

import { CategoriesTableContent } from "~/src/presentation/components/custom/pages/admin/catalog/categories/components/categories-table"
import {
  CategoriesSheetProvider,
  useCategoriesSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/hooks/use-categories-sheet"

const prefetchCategoriesQueries = async (context: { queryClient: QueryClient }): Promise<void> => {
  await Promise.all([
    context.queryClient.query({
      ...getAdminCategoriesQuery(),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...getCategoryStatsQuery(),
      staleTime: "static",
    }),
  ])
}

const CategoriesIndexRoute = (): JSX.Element => {
  const sheetState = useCategoriesSheetState()

  return (
    <CategoriesSheetProvider value={sheetState}>
      <CategoriesTableContent />
    </CategoriesSheetProvider>
  )
}

export const Route = createFileRoute("/admin/catalog/categories/")({
  component: CategoriesIndexRoute,
  loader: ({ context }) => prefetchCategoriesQueries(context),
  shouldReload: false,
  staleTime: CATEGORY_QUERY_STALE_MS,
})
