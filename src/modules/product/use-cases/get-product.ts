import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { DEFAULT_LOCALE } from "~/src/integrations/use-intl/i18n.config"

import { isProductInStock } from "~/src/modules/inventory/inventory.availability.utils"
import { getPublishedProductByHandleQuery } from "~/src/modules/product/product.accessors"
import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { mapPublishedProductForStorefront } from "~/src/modules/product/product.utils"

interface ProductByHandleInput {
  readonly handle: string
  readonly locale?: string | undefined
}

export const fetchProductByHandleFn = createServerFn({ method: "GET" })
  .validator((input: ProductByHandleInput) => input)
  .handler(async ({ data }) => {
    const { handle } = data
    const locale = data.locale ?? DEFAULT_LOCALE

    const prod = await getPublishedProductByHandleQuery.execute({ handle })

    if (prod === undefined || !isProductInStock(prod.variants)) {
      return false
    }

    return mapPublishedProductForStorefront(prod, locale)
  })

export const productQueryOptions = (handle: string, locale: string = DEFAULT_LOCALE) =>
  queryOptions({
    queryFn: () => fetchProductByHandleFn({ data: { handle, locale } }),
    queryKey: [...PRODUCT_QUERY_KEYS.BY_HANDLE, handle, locale] as const,
  })
