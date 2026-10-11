import { createElement } from "react"

import { createTranslator } from "use-intl"

import { type AuthEmailParams, requireAuthEmailDelivery } from "~/src/integrations/better-auth/auth.email-delivery.server"
import { PUBLIC_EMAIL_KINDS, admitPublicEmail } from "~/src/integrations/resend/resend.public-email-limits.server"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { buildLocalizedUrl } from "~/src/lib/seo"

import type verifyEmailMessages from "~/messages/en-US/emails.verify-email.json"
import { VERIFY_EMAIL_NAMESPACE, VerifyEmail } from "~/src/presentation/emails/verify-email"
import { ROUTES } from "~/src/routes"

const resolveEmailVerificationCallbackUrl = (url: string, locale: SupportedLocale): string => {
  try {
    const parsed = new URL(url)
    const callbackParam = parsed.searchParams.get("callbackURL")
    if (callbackParam === null) {
      return url
    }

    const callback = decodeURIComponent(callbackParam)
    const storefrontHome = buildLocalizedUrl("", "/", locale)
    const redirectsToStorefront = callback === "/" || callback === storefrontHome || callback.startsWith(`${storefrontHome}?`)
    if (!redirectsToStorefront) {
      return url
    }

    const accountCallback = buildLocalizedUrl("", `${ROUTES.ACCOUNT_OVERVIEW}?verified=true`, locale)
    parsed.searchParams.set("callbackURL", accountCallback)

    return parsed.toString()
  } catch {
    return url
  }
}

export const sendVerifyEmail = async ({ user, url }: AuthEmailParams): Promise<void> => {
  if (!(await admitPublicEmail({ kind: PUBLIC_EMAIL_KINDS.VERIFICATION, to: user.email }))) {
    return
  }

  const locale = getCurrentLocale()
  const verificationUrl = resolveEmailVerificationCallbackUrl(url, locale)
  const messages = await loadNamespace<typeof verifyEmailMessages>({ locale, namespace: VERIFY_EMAIL_NAMESPACE })
  await requireAuthEmailDelivery("verification", {
    react: createElement(VerifyEmail, {
      locale,
      messages,
      name: user.name,
      verificationUrl,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}
