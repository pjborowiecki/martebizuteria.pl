import { queryOptions } from "@tanstack/react-query"
import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"

import { withRequest } from "~/src/integrations/better-auth/auth.middleware"

import { findContentPageByHandle } from "~/src/modules/content-page/content-page.accessors"
import {
  CONTENT_PAGE_QUERY_KEYS,
  CONTENT_PAGE_QUERY_STALE_MS,
  type ContentPageHandle,
} from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"
import { revisionDateFor } from "~/src/modules/content-page/content-page.utils"
import { contentPageZodSchemas } from "~/src/modules/content-page/content-page.zod"
import { resolveLocalizedString } from "~/src/modules/product-attribute/product-attribute.utils"

interface ContentPageViewInput {
  readonly handle: ContentPageHandle
  readonly locale: string
}

export const getContentPage = createServerFn({ method: "GET" })
  .middleware([withRequest])
  .validator((input: ContentPageViewInput) => contentPageZodSchemas.viewInput.parse(input))
  .handler(async ({ data: { handle, locale } }): Promise<ContentPage["view"]> => {
    const page = await findContentPageByHandle(handle)
    if (page === undefined) {
      throw notFound()
    }

    return {
      body: resolveLocalizedString(page.bodies, locale),
      description: resolveLocalizedString(page.descriptions, locale),
      revisedAt: revisionDateFor(page.revisedAts, locale),
      title: resolveLocalizedString(page.titles, locale),
    }
  })

export const getContentPageQuery = (handle: ContentPageHandle, locale: string) =>
  queryOptions({
    queryFn: () => getContentPage({ data: { handle, locale } }),
    queryKey: [...CONTENT_PAGE_QUERY_KEYS.BY_HANDLE, handle, locale],
    staleTime: CONTENT_PAGE_QUERY_STALE_MS,
  })
