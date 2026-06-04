import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { attributeOnProductAccessors } from "~/src/modules/attribute-on-product/attribute-on-product.accessors";
import { productAttributeAccessors } from "~/src/modules/product-attribute/product-attribute.accessors";
import { PRODUCT_ATTRIBUTE_QUERY_STALE_MS } from "~/src/modules/product-attribute/product-attribute.constants";
import type { ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types";
import { computeProductAttributeStats } from "~/src/modules/product-attribute/product-attribute.utils";

const ZERO_COUNT = 0;

async function getAdminProductAttributeListItems(): Promise<(ProductAttribute["select"] & { productCount: number })[]> {
  const [attributes, countsById] = await Promise.all([
    productAttributeAccessors.getAdminProductAttributesQuery.execute(),
    attributeOnProductAccessors.getProductCountsByAttributeId()
  ]);

  return attributes.map((row) => Object.assign(row, { productCount: countsById.get(row.id) ?? ZERO_COUNT }));
}

const fetchAdminProductAttributesFn = createServerFn({ method: "GET" }).handler(() => getAdminProductAttributeListItems());

const fetchProductAttributeStatsFn = createServerFn({ method: "GET" }).handler(async (): Promise<ProductAttribute["stats"]> => {
  const items = await getAdminProductAttributeListItems();
  return computeProductAttributeStats(items);
});

export const productAttributeQueries = {
  fetchAdminProductAttributesFn,
  fetchProductAttributeStatsFn
};

export const productAttributeQueryOptions = {
  adminProductAttributesQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchAdminProductAttributesFn(),
      queryKey: CONSTANTS.QUERY_KEYS.PRODUCT_ATTRIBUTE.ADMIN.ALL,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: PRODUCT_ATTRIBUTE_QUERY_STALE_MS
    }),
  productAttributeStatsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchProductAttributeStatsFn(),
      queryKey: CONSTANTS.QUERY_KEYS.PRODUCT_ATTRIBUTE.ADMIN.STATS,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: PRODUCT_ATTRIBUTE_QUERY_STALE_MS
    })
};
