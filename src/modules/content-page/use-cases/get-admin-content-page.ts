import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { findContentPageByHandle } from "~/src/modules/content-page/content-page.accessors"
import {
  CONTENT_PAGE_QUERY_KEYS,
  CONTENT_PAGE_QUERY_STALE_MS,
  type ContentPageHandle,
} from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"
import { contentPageZodSchemas } from "~/src/modules/content-page/content-page.zod"

export const getAdminContentPage = createServerFn({ method: "GET" })
  .middleware([authorized({ content: ["read"] })])
  .validator((input: zod.input<typeof contentPageZodSchemas.handleInput>) => contentPageZodSchemas.handleInput.parse(input))
  .handler(async ({ data: { handle } }): Promise<ContentPage["select"]> => {
    const page = await findContentPageByHandle(handle)
    if (page === undefined) {
      throw notFound()
    }

    return page
  })

export const getAdminContentPageQuery = (handle: ContentPageHandle) =>
  queryOptions({
    queryFn: () => getAdminContentPage({ data: { handle } }),
    queryKey: [...CONTENT_PAGE_QUERY_KEYS.ADMIN.BY_HANDLE, handle],
    staleTime: CONTENT_PAGE_QUERY_STALE_MS,
  })
