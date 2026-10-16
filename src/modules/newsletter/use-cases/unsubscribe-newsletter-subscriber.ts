import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import type * as zod from "zod"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { getSubscriberById } from "~/src/modules/newsletter/newsletter.accessors"
import { NEWSLETTER_ERROR_CODES, NEWSLETTER_MUTATION_KEYS } from "~/src/modules/newsletter/newsletter.constants"
import { unsubscribeSubscriber } from "~/src/modules/newsletter/newsletter.unsubscribe.server"
import { newsletterZodSchemas } from "~/src/modules/newsletter/newsletter.zod"

export const unsubscribeNewsletterSubscriber = createServerFn({ method: "POST" })
  .middleware([authorized({ user: ["update"] })])
  .validator((input: zod.input<typeof newsletterZodSchemas.subscriberIdInput>) => newsletterZodSchemas.subscriberIdInput.parse(input))
  .handler(async ({ data: { id } }): Promise<{ readonly unsubscribed: boolean }> => {
    const subscriber = await getSubscriberById(id)
    if (subscriber === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND, NEWSLETTER_ERROR_CODES.SUBSCRIBER_NOT_FOUND)
    }

    return { unsubscribed: await unsubscribeSubscriber(subscriber) }
  })

export const unsubscribeNewsletterSubscriberMutation = mutationOptions({
  mutationFn: (data: Parameters<typeof unsubscribeNewsletterSubscriber>[0]["data"]) => unsubscribeNewsletterSubscriber({ data }),
  mutationKey: NEWSLETTER_MUTATION_KEYS.UNSUBSCRIBE_SUBSCRIBER,
})
