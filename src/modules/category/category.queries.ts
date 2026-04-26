import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { isNull, eq } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import { category } from "~/src/modules/category/category.schema";
import { product } from "~/src/modules/product/product.schema";

export const fetchCategoriesFn = createServerFn({ method: "GET" }).handler(() =>
  db.query.category.findMany({
    orderBy: (categories, { asc }) => [asc(categories.position)],
    where: isNull(category.parentId),
    with: {
      children: true
    }
  })
);

export const fetchCategoryByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const cat = await db.query.category.findFirst({
      where: eq(category.handle, handle),
      with: {
        children: true,
        parent: true
      }
    });

    if (cat === undefined) {
      return false;
    }

    const products = await db.query.product.findMany({
      limit: 20,
      where: eq(product.categoryId, cat.id),
      with: {
        variants: true
      }
    });

    return { ...cat, products };
  });

export const categoriesQueryOptions = () =>
  queryOptions({
    queryFn: () => fetchCategoriesFn(),
    queryKey: ["categories"]
  });

export const categoryQueryOptions = (handle: string) =>
  queryOptions({
    queryFn: () => fetchCategoryByHandleFn({ data: handle }),
    queryKey: ["category", handle]
  });
