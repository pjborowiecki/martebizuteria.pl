import { type JSX } from "react"

import { type QueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"

import { COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants"
import { adminCollectionsQueryOptions } from "~/src/modules/product-collection/use-cases/get-admin-collections"
import { collectionStatsQueryOptions } from "~/src/modules/product-collection/use-cases/get-collection-stats"

import { CollectionsTableContent } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-table"
import {
  CollectionsSheetProvider,
  useCollectionsSheetState,
} from "~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet"
const prefetchCollectionsQueries = async (context: { queryClient: QueryClient }): Promise<void> => {
  await Promise.all([
    context.queryClient.query({
      ...adminCollectionsQueryOptions(),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...collectionStatsQueryOptions(),
      staleTime: "static",
    }),
  ])
}
const CollectionsIndexRoute = (): JSX.Element => {
  const sheetState = useCollectionsSheetState()
  return (
    <CollectionsSheetProvider value={sheetState}>
      <CollectionsTableContent />
    </CollectionsSheetProvider>
  )
}
export const Route = createFileRoute("/{-$locale}/admin/catalog/collections/")({
  component: CollectionsIndexRoute,
  loader: ({ context }) => prefetchCollectionsQueries(context),
  shouldReload: false,
  staleTime: COLLECTION_QUERY_STALE_MS,
})
