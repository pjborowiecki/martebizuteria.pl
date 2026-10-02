import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { listContentPages } from "~/src/modules/content-page/content-page.accessors"
import { CONTENT_PAGE_QUERY_KEYS, CONTENT_PAGE_QUERY_STALE_MS } from "~/src/modules/content-page/content-page.constants"

export const getAdminContentPages = createServerFn({ method: "GET" })
  .middleware([authorized({ content: ["read"] })])
  .handler(() => listContentPages())

export const getAdminContentPagesQuery = () =>
  queryOptions({
    queryFn: () => getAdminContentPages(),
    queryKey: CONTENT_PAGE_QUERY_KEYS.ADMIN.ALL,
    staleTime: CONTENT_PAGE_QUERY_STALE_MS,
  })
