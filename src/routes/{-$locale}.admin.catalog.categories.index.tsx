import { type JSX } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { CategoriesTableContent } from "~/src/components/custom/pages/admin/catalog/categories/components/categories-table";
import {
  CategoriesSheetProvider,
  useCategoriesSheetState
} from "~/src/components/custom/pages/admin/catalog/categories/hooks/use-categories-sheet";

import { CATEGORY_QUERY_STALE_MS } from "~/src/modules/product-category/product-category.constants";
import { categoryQueryOptions } from "~/src/modules/product-category/product-category.queries";

async function prefetchCategoriesQueries(context: { queryClient: QueryClient }): Promise<void> {
  await Promise.all([
    context.queryClient.ensureQueryData(categoryQueryOptions.adminCategoriesQueryOptions()),
    context.queryClient.ensureQueryData(categoryQueryOptions.categoryStatsQueryOptions())
  ]);
}

export const Route = createFileRoute("/{-$locale}/admin/catalog/categories/")({
  component: CategoriesIndexRoute,
  loader: ({ context }) => prefetchCategoriesQueries(context),
  shouldReload: false,
  staleTime: CATEGORY_QUERY_STALE_MS
});

function CategoriesIndexRoute(): JSX.Element {
  const sheetState = useCategoriesSheetState();

  return (
    <CategoriesSheetProvider value={sheetState}>
      <CategoriesTableContent />
    </CategoriesSheetProvider>
  );
}
