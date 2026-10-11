import { createElement } from "react"

import { createTranslator } from "use-intl"

import { type AuthEmailParams, requireAuthEmailDelivery } from "~/src/integrations/better-auth/auth.email-delivery.server"
import { PUBLIC_EMAIL_KINDS, admitPublicEmail } from "~/src/integrations/resend/resend.public-email-limits.server"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import type resetPasswordMessages from "~/messages/en-US/emails.reset-password.json"
import { RESET_PASSWORD_NAMESPACE, ResetPassword } from "~/src/presentation/emails/reset-password"

export const sendResetPasswordEmail = async ({ user, url }: AuthEmailParams): Promise<void> => {
  if (!(await admitPublicEmail({ kind: PUBLIC_EMAIL_KINDS.PASSWORD_RESET, to: user.email }))) {
    return
  }

  const locale = getCurrentLocale()
  const messages = await loadNamespace<typeof resetPasswordMessages>({ locale, namespace: RESET_PASSWORD_NAMESPACE })
  await requireAuthEmailDelivery("reset-password", {
    react: createElement(ResetPassword, {
      locale,
      messages,
      name: user.name,
      resetPasswordUrl: url,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}
