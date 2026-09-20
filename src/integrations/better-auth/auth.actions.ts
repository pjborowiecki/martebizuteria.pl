import { env } from "cloudflare:workers"

import { createElement } from "react"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { getEmailMessages } from "~/src/integrations/use-intl/i18n.emails"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { buildLocalizedUrl } from "~/src/lib/sitemap"

import { AccountDeleted } from "~/src/presentation/emails/account-deleted"
import { ChangeEmail } from "~/src/presentation/emails/change-email"
import { ResetPassword } from "~/src/presentation/emails/reset-password"
import { VerifyEmail } from "~/src/presentation/emails/verify-email"
import { ROUTES } from "~/src/routes"
const resolveEmailVerificationCallbackUrl = (url: string, locale: ReturnType<typeof getCurrentLocale>): string => {
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
interface AuthEmailParams {
  readonly url: string
  readonly user: {
    readonly email: string
    readonly name: string
  }
}
interface AccountDeletedEmailParams {
  readonly email: string
  readonly locale?: ReturnType<typeof getCurrentLocale>
  readonly name: string
}
const sendVerificationEmail = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale()
  const verificationUrl = resolveEmailVerificationCallbackUrl(url, locale)
  const [, error] = await sendEmail({
    react: createElement(VerifyEmail, {
      locale,
      name: user.name,
      verificationUrl,
    }),
    subject: getEmailMessages(locale).pages.auth.email.verifyEmail.subject,
    to: user.email,
  })
  if (error !== undefined) {
    console.error("[Auth] Failed to send verification email", error)
  }
}
const sendResetPassword = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale()
  const [, error] = await sendEmail({
    react: createElement(ResetPassword, {
      locale,
      name: user.name,
      resetPasswordUrl: url,
    }),
    subject: getEmailMessages(locale).pages.auth.email.resetPassword.subject,
    to: user.email,
  })
  if (error !== undefined) {
    console.error("[Auth] Failed to send reset-password email", error)
  }
}
const sendChangeEmailConfirmation = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale()
  const [, error] = await sendEmail({
    react: createElement(ChangeEmail, {
      locale,
      name: user.name,
      verificationUrl: url,
    }),
    subject: getEmailMessages(locale).pages.auth.email.changeEmail.subject,
    to: user.email,
  })
  if (error !== undefined) {
    console.error("[Auth] Failed to send change-email confirmation", error)
  }
}
const sendAccountDeletedEmail = async ({ email, locale, name }: AccountDeletedEmailParams): Promise<void> => {
  const resolvedLocale = locale ?? getCurrentLocale()
  const storefrontUrl = `${env.VITE_APP_URL}/${resolvedLocale}`
  const [, error] = await sendEmail({
    react: createElement(AccountDeleted, {
      locale: resolvedLocale,
      name,
      storefrontUrl,
    }),
    subject: getEmailMessages(resolvedLocale).pages.auth.email.accountDeleted.subject,
    to: email,
  })
  if (error !== undefined) {
    console.error("[Auth] Failed to send account-deleted email", error)
  }
}
export const authActions = {
  sendAccountDeletedEmail,
  sendChangeEmailConfirmation,
  sendResetPassword,
  sendVerificationEmail,
}
