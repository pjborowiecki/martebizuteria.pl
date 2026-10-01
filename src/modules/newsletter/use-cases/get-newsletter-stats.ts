import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getAdminNewsletterStats } from "~/src/modules/newsletter/newsletter.accessors"
import { NEWSLETTER_QUERY_KEYS, NEWSLETTER_QUERY_STALE_MS } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"

export const getNewsletterStats = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["list"] })])
  .handler((): Promise<Newsletter["adminStats"]> => getAdminNewsletterStats())

export const getNewsletterStatsQuery = () =>
  queryOptions({
    queryFn: () => getNewsletterStats(),
    queryKey: NEWSLETTER_QUERY_KEYS.ADMIN.STATS,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    staleTime: NEWSLETTER_QUERY_STALE_MS,
  })
