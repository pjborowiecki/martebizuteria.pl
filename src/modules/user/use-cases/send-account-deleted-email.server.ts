import { createElement } from "react"

import { createTranslator } from "use-intl"

import { deliverAuthEmail, recordAuthEmailFailure } from "~/src/integrations/better-auth/auth.email-delivery.server"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { buildLocalizedUrl } from "~/src/lib/seo"

import type accountDeletedMessages from "~/messages/en-US/emails.account-deleted.json"
import { ACCOUNT_DELETED_NAMESPACE, AccountDeleted } from "~/src/presentation/emails/account-deleted"
import { ROUTES } from "~/src/routes"

export const sendAccountDeletedEmail = async ({ email, locale, name, origin }: AccountDeletedEmailParams): Promise<boolean> => {
  try {
    const resolvedLocale = locale ?? getCurrentLocale()
    const storefrontUrl = buildLocalizedUrl(origin, ROUTES.HOME, resolvedLocale)
    const messages = await loadNamespace<typeof accountDeletedMessages>({ locale: resolvedLocale, namespace: ACCOUNT_DELETED_NAMESPACE })

    return await deliverAuthEmail("account-deleted", {
      react: createElement(AccountDeleted, {
        locale: resolvedLocale,
        messages,
        name,
        storefrontUrl,
      }),
      subject: createTranslator({ locale: resolvedLocale, messages })("subject"),
      to: email,
    })
  } catch (error) {
    recordAuthEmailFailure("account-deleted", { failure: String(error), to: email })

    return false
  }
}

interface AccountDeletedEmailParams {
  readonly email: string
  readonly locale?: SupportedLocale
  readonly name: string
  readonly origin: string
}
