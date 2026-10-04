import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { buildLocalizedUrl } from "~/src/lib/seo"

import { APP_URL } from "~/src/presentation/branding/app"

import type newsletterMessages from "~/messages/en-US/emails.newsletter-confirmation.json"
import { NEWSLETTER_CONFIRMATION_NAMESPACE, NewsletterConfirmation } from "~/src/presentation/emails/newsletter-confirmation"
import { ROUTES } from "~/src/routes"

export const buildNewsletterConfirmUrl = (token: string, locale: SupportedLocale): string =>
  `${buildLocalizedUrl(APP_URL, ROUTES.NEWSLETTER_CONFIRM, locale)}?token=${encodeURIComponent(token)}`

export const sendNewsletterConfirmation = async ({
  email,
  locale,
  token,
}: SendNewsletterConfirmationInput): Promise<string | undefined> => {
  const messages = await loadNamespace<typeof newsletterMessages>({ locale, namespace: NEWSLETTER_CONFIRMATION_NAMESPACE })

  return sendEmail({
    react: createElement(NewsletterConfirmation, {
      confirmUrl: buildNewsletterConfirmUrl(token, locale),
      locale,
      messages,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: email,
  })
}

interface SendNewsletterConfirmationInput {
  readonly email: string
  readonly locale: SupportedLocale
  readonly token: string
}
