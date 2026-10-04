import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { buildLocalizedUrl } from "~/src/lib/seo"

import { APP_URL } from "~/src/presentation/branding/app"

import type alreadySubscribedMessages from "~/messages/en-US/emails.newsletter-already-subscribed.json"
import {
  NEWSLETTER_ALREADY_SUBSCRIBED_NAMESPACE,
  NewsletterAlreadySubscribed,
} from "~/src/presentation/emails/newsletter-already-subscribed"
import { ROUTES } from "~/src/routes"

export const sendNewsletterAlreadySubscribed = async ({
  email,
  locale,
}: SendNewsletterAlreadySubscribedInput): Promise<string | undefined> => {
  const messages = await loadNamespace<typeof alreadySubscribedMessages>({ locale, namespace: NEWSLETTER_ALREADY_SUBSCRIBED_NAMESPACE })

  return sendEmail({
    react: createElement(NewsletterAlreadySubscribed, {
      locale,
      messages,
      storefrontUrl: buildLocalizedUrl(APP_URL, ROUTES.HOME, locale),
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: email,
  })
}

interface SendNewsletterAlreadySubscribedInput {
  readonly email: string
  readonly locale: SupportedLocale
}
