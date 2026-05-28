import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { productAccessors } from "~/src/modules/product/product.accessors";

const fetchProductsFn = createServerFn({ method: "GET" }).handler(() => productAccessors.getPublishedProductsQuery.execute());

const fetchProductByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const prod = await productAccessors.getProductByHandleQuery.execute({ handle });

    if (prod === undefined) {
      return false;
    }

    return prod;
  });

const fetchRelatedProductsFn = createServerFn({ method: "GET" })
  .inputValidator((categoryId: string | null) => categoryId)
  .handler(({ data: categoryId }) => {
    if (categoryId === null) {
      return [];
    }

    return productAccessors.getRelatedProductsQuery.execute({ categoryId });
  });

export const productQueries = {
  fetchProductByHandleFn,
  fetchProductsFn,
  fetchRelatedProductsFn
};

export const productQueryOptions = {
  productQueryOptions: (handle: string) =>
    queryOptions({
      queryFn: () => fetchProductByHandleFn({ data: handle }),
      queryKey: ["product", handle]
    }),
  productsQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchProductsFn(),
      queryKey: ["products"]
    }),
  relatedProductsQueryOptions: (categoryId: string | null) =>
    queryOptions({
      queryFn: () => fetchRelatedProductsFn({ data: categoryId }),
      queryKey: ["related-products", categoryId]
    })
};
