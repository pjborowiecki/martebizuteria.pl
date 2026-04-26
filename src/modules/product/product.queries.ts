import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { product } from "~/src/modules/product/product.schema";

export const fetchProductsFn = createServerFn({ method: "GET" }).handler(() =>
  db.query.product.findMany({
    limit: 20,
    orderBy: (products, { desc }) => [desc(products.createdAt)],
    where: eq(product.status, "published")
  })
);

export const fetchProductByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const prod = await db.query.product.findFirst({
      where: eq(product.handle, handle),
      with: {
        category: true,
        collection: true,
        variants: true
      }
    });

    if (prod === undefined) {
      return false;
    }

    return prod;
  });

export const productsQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchProductsFn(),
    queryKey: ["products"]
  });

export const productQueryOptions = (handle: string) =>
  queryOptions({
    queryFn: () => fetchProductByHandleFn({ data: handle }),
    queryKey: ["product", handle]
  });
