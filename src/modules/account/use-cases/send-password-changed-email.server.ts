import { createElement } from "react"

import { createTranslator } from "use-intl"

import { type AuthEmailParams, deliverAuthEmail, recordAuthEmailFailure } from "~/src/integrations/better-auth/auth.email-delivery.server"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { resolveRequestOrigin } from "~/src/lib/request"
import { buildLocalizedUrl } from "~/src/lib/seo"

import type passwordChangedMessages from "~/messages/en-US/emails.password-changed.json"
import { PASSWORD_CHANGED_NAMESPACE, PasswordChanged } from "~/src/presentation/emails/password-changed"
import { ROUTES } from "~/src/routes"

export const sendPasswordChangedEmail = async ({ request, user }: PasswordChangedEmailParams): Promise<void> => {
  try {
    const locale = getCurrentLocale()
    const signInUrl = buildLocalizedUrl(resolveRequestOrigin(request), ROUTES.AUTH_SIGN_IN, locale)
    const messages = await loadNamespace<typeof passwordChangedMessages>({ locale, namespace: PASSWORD_CHANGED_NAMESPACE })

    await deliverAuthEmail("password-changed", {
      react: createElement(PasswordChanged, {
        locale,
        messages,
        name: user.name,
        signInUrl,
      }),
      subject: createTranslator({ locale, messages })("subject"),
      to: user.email,
    })
  } catch (error) {
    recordAuthEmailFailure("password-changed", user.email, String(error))
  }
}

interface PasswordChangedEmailParams {
  readonly request: Request
  readonly user: AuthEmailParams["user"]
}
