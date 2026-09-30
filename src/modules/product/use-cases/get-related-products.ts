import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { getPublishedRelatedProducts } from "~/src/modules/product/product.accessors"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { productZodSchemas } from "~/src/modules/product/product.zod"

export const getRelatedProducts = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: zod.input<typeof productZodSchemas.relatedProductsInput>) => productZodSchemas.relatedProductsInput.parse(input))
  .handler(({ data: { categoryId, excludeProductId } }) => {
    if (categoryId === null || categoryId === undefined) {
      return []
    }

    return getPublishedRelatedProducts(categoryId, excludeProductId)
  })

export const getRelatedProductsQuery = (
  categoryId: string | null | undefined,
  excludeProductId: string,
  locale: string = I18N.DEFAULT_LOCALE,
) =>
  queryOptions({
    queryFn: () => getRelatedProducts({ data: { categoryId, excludeProductId, locale } }),
    queryKey: [...PRODUCT_QUERY_KEYS.RELATED_BY_CATEGORY, categoryId, excludeProductId, locale],
  })
