import { createElement } from "react"

import { createTranslator } from "use-intl"

import { type AuthEmailParams, requireAuthEmailDelivery } from "~/src/integrations/better-auth/auth.email-delivery.server"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import type changeEmailMessages from "~/messages/en-US/emails.change-email.json"
import { CHANGE_EMAIL_NAMESPACE, ChangeEmail } from "~/src/presentation/emails/change-email"

export const sendChangeEmailConfirmationEmail = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale()
  const messages = await loadNamespace<typeof changeEmailMessages>({ locale, namespace: CHANGE_EMAIL_NAMESPACE })
  await requireAuthEmailDelivery("change-email", {
    react: createElement(ChangeEmail, {
      locale,
      messages,
      name: user.name,
      verificationUrl: url,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}
