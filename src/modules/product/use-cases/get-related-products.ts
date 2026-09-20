import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"

import { getPublishedRelatedProducts } from "~/src/modules/product/product.accessors"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"

interface RelatedProductsInput {
  readonly categoryId: string | null | undefined
  readonly excludeProductId: string
  readonly locale: string
}

export const fetchRelatedProductsFn = createServerFn({ method: "GET" })
  .validator((input: RelatedProductsInput) => input)
  .handler(({ data: { categoryId, excludeProductId } }) => {
    if (categoryId === null || categoryId === undefined) {
      return []
    }

    return getPublishedRelatedProducts(categoryId, excludeProductId)
  })

export const relatedProductsQueryOptions = (
  categoryId: string | null | undefined,
  excludeProductId: string,
  locale: string = DEFAULT_LOCALE,
) =>
  queryOptions({
    queryFn: () => fetchRelatedProductsFn({ data: { categoryId, excludeProductId, locale } }),
    queryKey: [...PRODUCT_QUERY_KEYS.RELATED_BY_CATEGORY, categoryId, excludeProductId, locale] as const,
  })
