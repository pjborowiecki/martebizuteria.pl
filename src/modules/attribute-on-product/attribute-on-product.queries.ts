import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { attributeOnProductAccessors } from "~/src/modules/attribute-on-product/attribute-on-product.accessors";

const ATTRIBUTE_ON_PRODUCT_QUERY_STALE_MS = 60_000;

const fetchByProductIdFn = createServerFn({ method: "GET" })
  .inputValidator((productId: string) => productId)
  .handler(({ data: productId }) => attributeOnProductAccessors.getByProductIdQuery.execute({ productId }));

export const attributeOnProductQueries = {
  fetchByProductIdFn
};

export const attributeOnProductQueryOptions = {
  byProductId: (productId: string) =>
    queryOptions({
      enabled: productId !== "",
      queryFn: () => fetchByProductIdFn({ data: productId }),
      queryKey: [...CONSTANTS.QUERY_KEYS.ATTRIBUTE_ON_PRODUCT.BY_PRODUCT_ID, productId] as const,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      staleTime: ATTRIBUTE_ON_PRODUCT_QUERY_STALE_MS
    })
};
