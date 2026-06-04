import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";

import { productImageAccessors } from "~/src/modules/product-image/product-image.accessors";
import { PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants";

const fetchProductImagesFn = createServerFn({ method: "GET" })
  .inputValidator((productId: string) => productId)
  .handler(({ data: productId }) => productImageAccessors.getProductImagesQuery.execute({ productId }));

export const productImageQueries = {
  fetchProductImagesFn
};

export const productImageQueryOptions = {
  byProductId: (productId: string) =>
    queryOptions({
      enabled: productId !== "",
      queryFn: () => fetchProductImagesFn({ data: productId }),
      queryKey: [...CONSTANTS.QUERY_KEYS.PRODUCT_IMAGE.BY_PRODUCT_ID, productId] as const,
      staleTime: PRODUCT_QUERY_STALE_MS
    })
};
