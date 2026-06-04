import { type JSX } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { CollectionsTableContent } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-table";
import {
  CollectionsSheetProvider,
  useCollectionsSheetState
} from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet";

import { COLLECTION_QUERY_STALE_MS } from "~/src/modules/product-collection/product-collection.constants";
import { collectionQueryOptions } from "~/src/modules/product-collection/product-collection.queries";

async function prefetchCollectionsQueries(context: { queryClient: QueryClient }): Promise<void> {
  await Promise.all([
    context.queryClient.ensureQueryData(collectionQueryOptions.adminCollectionsQueryOptions()),
    context.queryClient.ensureQueryData(collectionQueryOptions.collectionStatsQueryOptions())
  ]);
}

export const Route = createFileRoute("/{-$locale}/admin/catalog/collections/")({
  component: CollectionsIndexRoute,
  loader: ({ context }) => prefetchCollectionsQueries(context),
  shouldReload: false,
  staleTime: COLLECTION_QUERY_STALE_MS
});

function CollectionsIndexRoute(): JSX.Element {
  const sheetState = useCollectionsSheetState();

  return (
    <CollectionsSheetProvider value={sheetState}>
      <CollectionsTableContent />
    </CollectionsSheetProvider>
  );
}
