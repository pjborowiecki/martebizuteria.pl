import { type ReactElement } from "react"

import { render } from "react-email"

import { type Locale } from "~/src/integrations/use-intl/i18n.types"

import { AccountDeleted } from "~/src/presentation/emails/account-deleted"
import { ChangeEmail } from "~/src/presentation/emails/change-email"
import { OrderConfirmation } from "~/src/presentation/emails/order-confirmation"
import { OrderShipped } from "~/src/presentation/emails/order-shipped"
import { ResetPassword } from "~/src/presentation/emails/reset-password"
import { VerifyEmail } from "~/src/presentation/emails/verify-email"

export const isEmailPreviewSlug = (value: string): value is EmailPreviewSlug => SLUGS.includes(value)

export const renderEmailPreview = (slug: EmailPreviewSlug, locale: Locale, plainText: boolean): Promise<string> =>
  render(
    EMAIL_PREVIEWS[slug].element(locale),
    plainText
      ? {
          plainText: true,
        }
      : {
          plainText: false,
        },
  )

interface EmailPreview {
  readonly element: (locale: Locale) => ReactElement
  readonly label: string
}

export const EMAIL_PREVIEWS = {
  "account-deleted": {
    element: (locale) => <AccountDeleted {...AccountDeleted.PreviewProps} locale={locale} />,
    label: "Account deleted",
  },
  "change-email": {
    element: (locale) => <ChangeEmail {...ChangeEmail.PreviewProps} locale={locale} />,
    label: "Change email",
  },
  "order-confirmation": {
    element: (locale) => <OrderConfirmation {...OrderConfirmation.PreviewProps} locale={locale} />,
    label: "Order confirmation",
  },
  "order-shipped": {
    element: (locale) => <OrderShipped {...OrderShipped.PreviewProps} locale={locale} />,
    label: "Order shipped",
  },
  "reset-password": {
    element: (locale) => <ResetPassword {...ResetPassword.PreviewProps} locale={locale} />,
    label: "Reset password",
  },
  "verify-email": {
    element: (locale) => <VerifyEmail {...VerifyEmail.PreviewProps} locale={locale} />,
    label: "Verify email",
  },
} satisfies Record<string, EmailPreview>
export type EmailPreviewSlug = keyof typeof EMAIL_PREVIEWS
const SLUGS: string[] = Object.keys(EMAIL_PREVIEWS)
