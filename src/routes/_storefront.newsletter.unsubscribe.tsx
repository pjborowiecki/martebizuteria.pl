import { type JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import { z } from "zod/v4"

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { NEWSLETTER_TOKEN_RESULT } from "~/src/modules/newsletter/newsletter.constants"
import { type Newsletter } from "~/src/modules/newsletter/newsletter.types"
import { unsubscribeFromNewsletter } from "~/src/modules/newsletter/use-cases/unsubscribe-from-newsletter"

import { pageHead } from "~/src/lib/seo"

import { APP_NAME } from "~/src/presentation/branding/app"

import { newsletterDescriptionKey, newsletterTitleKey } from "~/src/presentation/components/custom/pages/newsletter/newsletter-token-copy"
import { NewsletterTokenPage } from "~/src/presentation/components/custom/pages/newsletter/newsletter-token-page"

import type newsletterMessages from "~/messages/en-US/pages.newsletter.json"

const TOKEN_MAX_LENGTH = 128

const NewsletterUnsubscribeRoute = (): JSX.Element => {
  const { email, result } = Route.useLoaderData()

  const t = useTranslations("pages.newsletter.unsubscribe")

  return (
    <NewsletterTokenPage
      description={t(newsletterDescriptionKey(result), { email })}
      linkLabel={t("continueShopping")}
      result={result}
      title={t(newsletterTitleKey(result))}
    />
  )
}

const unsubscribeToken = (token: string | undefined): Promise<Newsletter["tokenResult"]> => {
  if (token === undefined) {
    return Promise.resolve({ email: undefined, result: NEWSLETTER_TOKEN_RESULT.INVALID })
  }

  return unsubscribeFromNewsletter({ data: { token } })
}

export const Route = createFileRoute("/_storefront/newsletter/unsubscribe")({
  component: NewsletterUnsubscribeRoute,
  head: pageHead,
  loader: async ({ context, deps }) => {
    const { locale } = context

    const [messages, outcome] = await Promise.all([
      context.queryClient.query(messagesQueryOptions<typeof newsletterMessages>({ locale, namespace: "pages.newsletter" })),
      unsubscribeToken(deps.token),
    ])

    return {
      description: messages.unsubscribe.metadata.description,
      email: outcome.email ?? "",
      result: outcome.result,
      title: `${APP_NAME} | ${messages.unsubscribe.metadata.title}`,
    }
  },
  loaderDeps: ({ search }: { search: { token?: string | undefined } }) => ({ token: search.token }),
  staticData: {
    namespaces: ["pages.newsletter"],
  },
  validateSearch: z.object({
    token: z.string().trim().max(TOKEN_MAX_LENGTH).optional(),
  }),
})
