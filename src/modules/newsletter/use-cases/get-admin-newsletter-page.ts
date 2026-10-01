import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LIST_PAGE_FIRST, buildListPaginationResult, listPaginationParamsFromPage } from "~/src/modules/_core/utils/pagination"
import { normalizeAdminSearchTerm } from "~/src/modules/_core/utils/search-conditions.server"
import { getAdminSubscribersPage } from "~/src/modules/newsletter/newsletter.accessors"
import { ADMIN_NEWSLETTER_PAGE_SIZE, NEWSLETTER_QUERY_KEYS, NEWSLETTER_QUERY_STALE_MS } from "~/src/modules/newsletter/newsletter.constants"
import { toAdminNewsletterListItem } from "~/src/modules/newsletter/newsletter.utils"
import { newsletterZodSchemas } from "~/src/modules/newsletter/newsletter.zod"

export const getAdminNewsletterPage = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["list"] })])
  .validator((input: zod.input<typeof newsletterZodSchemas.adminNewsletterPageInput>) =>
    newsletterZodSchemas.adminNewsletterPageInput.parse(input),
  )
  .handler(async ({ data: input }) => {
    const params = {
      ...listPaginationParamsFromPage(input.page ?? LIST_PAGE_FIRST, input.pageSize ?? ADMIN_NEWSLETTER_PAGE_SIZE),
      search: normalizeAdminSearchTerm(input.search),
    }
    const { rows, total } = await getAdminSubscribersPage(params)

    return buildListPaginationResult(
      rows.map((row) => toAdminNewsletterListItem(row)),
      total,
      params,
    )
  })

export const getAdminNewsletterPageQuery = (input: zod.input<typeof newsletterZodSchemas.adminNewsletterPageInput>) =>
  queryOptions({
    queryFn: () => getAdminNewsletterPage({ data: input }),
    queryKey: [...NEWSLETTER_QUERY_KEYS.ADMIN.PAGE, input],
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: NEWSLETTER_QUERY_STALE_MS,
  })
