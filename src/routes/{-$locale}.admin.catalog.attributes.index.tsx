import { type JSX } from "react"

import { type QueryClient } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod/v4"

import { PRODUCT_ATTRIBUTE_QUERY_STALE_MS } from "~/src/modules/product-attribute/product-attribute.constants"
import { adminProductAttributesQueryOptions } from "~/src/modules/product-attribute/use-cases/get-admin-product-attributes"
import { productAttributeStatsQueryOptions } from "~/src/modules/product-attribute/use-cases/get-product-attribute-stats"

import { AttributesTable } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-table"
const prefetchAttributesQueries = async (context: { queryClient: QueryClient }): Promise<void> => {
  await Promise.all([
    context.queryClient.query({
      ...adminProductAttributesQueryOptions(),
      staleTime: "static",
    }),
    context.queryClient.query({
      ...productAttributeStatsQueryOptions(),
      staleTime: "static",
    }),
  ])
}
const AttributesIndexRoute = (): JSX.Element => <AttributesTable />

const attributesIndexSearchSchema = z.object({
  create: z.literal("1").optional(),
})
export const Route = createFileRoute("/{-$locale}/admin/catalog/attributes/")({
  component: AttributesIndexRoute,
  loader: ({ context }) => prefetchAttributesQueries(context),
  shouldReload: false,
  staleTime: PRODUCT_ATTRIBUTE_QUERY_STALE_MS,
  validateSearch: attributesIndexSearchSchema,
})
