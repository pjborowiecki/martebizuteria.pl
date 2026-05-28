import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { categoryAccessors } from "~/src/modules/category/category.accessors";

const fetchCategoriesFn = createServerFn({ method: "GET" }).handler(() => categoryAccessors.getRootCategoriesQuery.execute());

const fetchCategoryByHandleFn = createServerFn({ method: "GET" })
  .inputValidator((handle: string) => handle)
  .handler(async ({ data: handle }) => {
    const cat = await categoryAccessors.getCategoryByHandleQuery.execute({ handle });

    if (cat === undefined) {
      return false;
    }

    const products = await categoryAccessors.getProductsByCategoryIdQuery.execute({ categoryId: cat.id });

    return { ...cat, products };
  });

export const categoryQueries = {
  fetchCategoriesFn,
  fetchCategoryByHandleFn
};

export const categoryQueryOptions = {
  categoriesQueryOptions: () =>
    queryOptions({
      queryFn: () => fetchCategoriesFn(),
      queryKey: ["categories"]
    }),
  categoryQueryOptions: (handle: string) =>
    queryOptions({
      queryFn: () => fetchCategoryByHandleFn({ data: handle }),
      queryKey: ["category", handle]
    })
};
