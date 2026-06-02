import { type JSX } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { isServer } from "~/src/lib/is-server";

import { CollectionsTableContent } from "~/src/components/custom/pages/admin/catalog/collections/components/collections-table";
import {
  CollectionsSheetProvider,
  useCollectionsSheetState
} from "~/src/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet";

import { COLLECTION_QUERY_STALE_MS } from "~/src/modules/collection/collection.constants";
import { collectionQueryOptions } from "~/src/modules/collection/collection.queries";

async function prefetchCollectionsQueries(context: { queryClient: QueryClient }): Promise<void> {
  const collections = collectionQueryOptions.adminCollectionsQueryOptions();
  const stats = collectionQueryOptions.collectionStatsQueryOptions();

  if (isServer()) {
    await Promise.all([context.queryClient.ensureQueryData(collections), context.queryClient.ensureQueryData(stats)]);
    return;
  }

  void context.queryClient.prefetchQuery(collections);
  void context.queryClient.prefetchQuery(stats);
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
