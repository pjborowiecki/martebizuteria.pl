import { type JSX } from "react"

import { useMutation } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod/v4"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { confirmNewsletterSubscriptionMutation } from "~/src/modules/newsletter/use-cases/confirm-newsletter-subscription"

import { type PageMeta, pageHead } from "~/src/lib/seo"

import { APP_NAME } from "~/src/presentation/branding/app"

import { NewsletterTokenPage } from "~/src/presentation/components/custom/pages/newsletter/newsletter-token-page"

import type newsletterMessages from "~/messages/en-US/pages.newsletter.json"

const TOKEN_MAX_LENGTH = 128

const NewsletterConfirmRoute = (): JSX.Element => {
  const { token } = Route.useSearch()
  const mutation = useMutation(confirmNewsletterSubscriptionMutation)

  return <NewsletterTokenPage mutation={mutation} namespace="pages.newsletter.confirm" token={token} />
}

export const Route = createFileRoute("/_storefront/newsletter/confirm")({
  component: NewsletterConfirmRoute,
  head: pageHead,
  loader: async ({ context }) => {
    const { locale } = context
    const messages = await context.queryClient.query(
      messagesQueryOptions<typeof newsletterMessages>({ locale, namespace: "pages.newsletter" }),
    )

    return {
      description: messages.confirm.metadata.description,
      title: `${APP_NAME} | ${messages.confirm.metadata.title}`,
    } satisfies PageMeta
  },
  staticData: {
    namespaces: ["pages.newsletter"],
  },
  validateSearch: z.object({
    token: z.string().trim().max(TOKEN_MAX_LENGTH).optional(),
  }),
})
