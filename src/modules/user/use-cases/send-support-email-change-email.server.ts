import { createElement } from "react"

import { createTranslator } from "use-intl"

import { deliverAuthEmail } from "~/src/integrations/better-auth/auth.email-delivery.server"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { AUDIT_EMAIL_KIND } from "~/src/modules/audit-log/audit-log.constants"

import type changeEmailMessages from "~/messages/en-US/emails.change-email.json"
import { ChangeEmail, SUPPORT_EMAIL_CHANGE_NAMESPACE } from "~/src/presentation/emails/change-email"

export const sendSupportEmailChangeEmail = async ({ email, locale, name, url, userId }: Readonly<SupportEmailChange>): Promise<boolean> => {
  const messages = await loadNamespace<typeof changeEmailMessages>({ locale, namespace: SUPPORT_EMAIL_CHANGE_NAMESPACE })

  return deliverAuthEmail(AUDIT_EMAIL_KIND.VERIFICATION, {
    react: createElement(ChangeEmail, { locale, messages, name, verificationUrl: url }),
    subject: createTranslator({ locale, messages })("subject"),
    to: email,
    userId,
  })
}

interface SupportEmailChange {
  readonly email: string
  readonly locale: SupportedLocale
  readonly name: string
  readonly url: string
  readonly userId: string
}
