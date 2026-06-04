import { type JSX } from "react";

import type { QueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod/v4";

import { AttributesTable } from "~/src/components/custom/pages/admin/catalog/attributes/components/attributes-table";

import { PRODUCT_ATTRIBUTE_QUERY_STALE_MS } from "~/src/modules/product-attribute/product-attribute.constants";
import { productAttributeQueryOptions } from "~/src/modules/product-attribute/product-attribute.queries";

async function prefetchAttributesQueries(context: { queryClient: QueryClient }): Promise<void> {
  await Promise.all([
    context.queryClient.ensureQueryData(productAttributeQueryOptions.adminProductAttributesQueryOptions()),
    context.queryClient.ensureQueryData(productAttributeQueryOptions.productAttributeStatsQueryOptions())
  ]);
}

const attributesIndexSearchSchema = z.object({
  create: z.literal("1").optional()
});

export const Route = createFileRoute("/{-$locale}/admin/catalog/attributes/")({
  component: AttributesIndexRoute,
  loader: ({ context }) => prefetchAttributesQueries(context),
  shouldReload: false,
  staleTime: PRODUCT_ATTRIBUTE_QUERY_STALE_MS,
  validateSearch: attributesIndexSearchSchema
});

function AttributesIndexRoute(): JSX.Element {
  return <AttributesTable />;
}
