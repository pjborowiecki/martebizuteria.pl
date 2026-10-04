import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { buildLocalizedUrl } from "~/src/lib/seo"

import type newsletterMessages from "~/messages/en-US/emails.newsletter-confirmation.json"
import { NEWSLETTER_CONFIRMATION_NAMESPACE, NewsletterConfirmation } from "~/src/presentation/emails/newsletter-confirmation"
import { ROUTES } from "~/src/routes"

export const buildNewsletterConfirmUrl = ({ locale, origin, token }: NewsletterConfirmUrlInput): string =>
  `${buildLocalizedUrl(origin, ROUTES.NEWSLETTER_CONFIRM, locale)}?token=${encodeURIComponent(token)}`

export const sendNewsletterConfirmation = async ({
  email,
  locale,
  origin,
  token,
}: SendNewsletterConfirmationInput): Promise<string | undefined> => {
  const messages = await loadNamespace<typeof newsletterMessages>({ locale, namespace: NEWSLETTER_CONFIRMATION_NAMESPACE })

  return sendEmail({
    react: createElement(NewsletterConfirmation, {
      confirmUrl: buildNewsletterConfirmUrl({ locale, origin, token }),
      locale,
      messages,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: email,
  })
}

interface NewsletterConfirmUrlInput {
  readonly locale: SupportedLocale
  readonly origin: string
  readonly token: string
}

interface SendNewsletterConfirmationInput extends NewsletterConfirmUrlInput {
  readonly email: string
}
