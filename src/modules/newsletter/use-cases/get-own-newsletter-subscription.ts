import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { getSubscriberByEmail, normalizeSubscriberEmail } from "~/src/modules/newsletter/newsletter.accessors"
import { NEWSLETTER_QUERY_KEYS, NEWSLETTER_QUERY_STALE_MS, type NewsletterStatus } from "~/src/modules/newsletter/newsletter.constants"

export const getOwnNewsletterSubscription = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }): Promise<{ readonly status: NewsletterStatus | undefined }> => {
    const subscriber = await getSubscriberByEmail(normalizeSubscriberEmail(context.auth.user.email))

    return { status: subscriber?.status }
  })

export const getOwnNewsletterSubscriptionQuery = () =>
  queryOptions({
    queryFn: () => getOwnNewsletterSubscription(),
    queryKey: NEWSLETTER_QUERY_KEYS.OWN_SUBSCRIPTION,
    staleTime: NEWSLETTER_QUERY_STALE_MS,
  })
