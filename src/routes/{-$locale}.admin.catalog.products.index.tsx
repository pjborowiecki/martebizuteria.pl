import { type JSX } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";

import { ProductsTableContent } from "~/src/components/custom/pages/admin/catalog/products/components/products-table";
import {
  ProductsSheetProvider,
  useProductsSheetState
} from "~/src/components/custom/pages/admin/catalog/products/hooks/use-products-sheet";

import { productAttributeQueryOptions } from "~/src/modules/product-attribute/product-attribute.queries";
import { categoryQueryOptions } from "~/src/modules/product-category/product-category.queries";
import { collectionQueryOptions } from "~/src/modules/product-collection/product-collection.queries";
import { PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants";
import { productQueryOptions } from "~/src/modules/product/product.queries";

async function prefetchProductsQueries(context: { queryClient: QueryClient }): Promise<void> {
  await Promise.all([
    context.queryClient.ensureQueryData(productQueryOptions.adminProductsQueryOptions()),
    context.queryClient.ensureQueryData(productQueryOptions.productStatsQueryOptions()),
    context.queryClient.ensureQueryData(categoryQueryOptions.adminCategoriesQueryOptions()),
    context.queryClient.ensureQueryData(collectionQueryOptions.adminCollectionsQueryOptions()),
    context.queryClient.ensureQueryData(productAttributeQueryOptions.adminProductAttributesQueryOptions())
  ]);
}

export const Route = createFileRoute("/{-$locale}/admin/catalog/products/")({
  component: ProductsIndexRoute,
  loader: ({ context }) => prefetchProductsQueries(context),
  shouldReload: false,
  staleTime: PRODUCT_QUERY_STALE_MS
});

function ProductsIndexRoute(): JSX.Element {
  const sheetState = useProductsSheetState();

  return (
    <ProductsSheetProvider value={sheetState}>
      <ProductsTableContent />
    </ProductsSheetProvider>
  );
}
