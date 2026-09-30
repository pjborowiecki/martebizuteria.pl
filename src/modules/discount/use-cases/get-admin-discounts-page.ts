import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/modules/_core/utils/pagination"
import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { getAdminDiscountsPage as accessorGetAdminDiscountsPage } from "~/src/modules/discount/discount.accessors"
import { ADMIN_DISCOUNTS_PAGE_SIZE, DISCOUNT_QUERY_KEYS, DISCOUNT_QUERY_STALE_MS } from "~/src/modules/discount/discount.constants"
import { toAdminDiscountListItem } from "~/src/modules/discount/discount.persist.utils"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"

export const getAdminDiscountsPage = createServerFn({ method: "GET" })
  .middleware([authorized({ order: ["read"] })])
  .validator((input: zod.input<typeof discountZodSchemas.adminDiscountsPageInput>) =>
    discountZodSchemas.adminDiscountsPageInput.parse(input),
  )
  .handler(async ({ data: input }) => {
    const params = {
      ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, input.pageSize ?? ADMIN_DISCOUNTS_PAGE_SIZE),
      search: normalizeAdminSearchTerm(input.search),
    }
    const { rows, total } = await accessorGetAdminDiscountsPage(params)
    const now = new Date()

    return buildListPaginationResult(
      rows.map((row) => toAdminDiscountListItem(row, now)),
      total,
      params,
    )
  })

export const getAdminDiscountsPageQuery = (input: zod.input<typeof discountZodSchemas.adminDiscountsPageInput>) =>
  queryOptions({
    queryFn: () => getAdminDiscountsPage({ data: input }),
    queryKey: [...DISCOUNT_QUERY_KEYS.ADMIN.PAGE, input],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: DISCOUNT_QUERY_STALE_MS,
  })
