import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { listRecentNewsletterCampaigns } from "~/src/modules/newsletter-campaign/newsletter-campaign.accessors"
import {
  NEWSLETTER_CAMPAIGN_QUERY_KEYS,
  NEWSLETTER_CAMPAIGN_QUERY_STALE_MS,
} from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"

export const getAdminNewsletterCampaigns = createServerFn({ method: "GET" })
  .middleware([authorized({ content: ["read"] })])
  .handler((): Promise<NewsletterCampaign["adminListItem"][]> => listRecentNewsletterCampaigns())

export const getAdminNewsletterCampaignsQuery = () =>
  queryOptions({
    queryFn: () => getAdminNewsletterCampaigns(),
    queryKey: NEWSLETTER_CAMPAIGN_QUERY_KEYS.ADMIN.LIST,
    staleTime: NEWSLETTER_CAMPAIGN_QUERY_STALE_MS,
  })
