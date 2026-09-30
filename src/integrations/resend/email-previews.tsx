import { type ReactElement } from "react"

import { render } from "react-email"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { STANDARD_VAT_BASIS_POINTS } from "~/src/modules/_core/constants/tax"

import type accountDeletedMessages from "~/messages/en-US/emails.account-deleted.json"
import type changeEmailMessages from "~/messages/en-US/emails.change-email.json"
import type orderConfirmationMessages from "~/messages/en-US/emails.order-confirmation.json"
import type orderShippedMessages from "~/messages/en-US/emails.order-shipped.json"
import type resetPasswordMessages from "~/messages/en-US/emails.reset-password.json"
import type verifyEmailMessages from "~/messages/en-US/emails.verify-email.json"
import { ACCOUNT_DELETED_NAMESPACE, AccountDeleted } from "~/src/presentation/emails/account-deleted"
import { CHANGE_EMAIL_NAMESPACE, ChangeEmail } from "~/src/presentation/emails/change-email"
import { ORDER_CONFIRMATION_NAMESPACE, OrderConfirmation } from "~/src/presentation/emails/order-confirmation"
import { ORDER_SHIPPED_NAMESPACE, OrderShipped } from "~/src/presentation/emails/order-shipped"
import { RESET_PASSWORD_NAMESPACE, ResetPassword } from "~/src/presentation/emails/reset-password"
import { VERIFY_EMAIL_NAMESPACE, VerifyEmail } from "~/src/presentation/emails/verify-email"

const PREVIEW_NAME = "Jane Doe"

const PREVIEW_ORDER_NUMBER = "MRT-2026-00042"

const PREVIEW_IMAGE = "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.svg"

const PREVIEW_ADDRESS = "Anna Kowalska\nul. Mokotowska 12/4\n00-640 Warszawa\nPL\n+48 600 123 456"

const PREVIEW_TRACKING_NUMBER = "00259007123456789012"

const PREVIEW_ORDER_CONFIRMATION_DETAILS = {
  billingAddress: "Tak jak adres dostawy",
  deliveryMethod: "Kurier DPD · dostawa do domu",
  estimatedDelivery: "2–4 dni robocze od wysyłki",
  fulfillmentTime: "1–3 dni robocze",
  paymentMethod: "Karta płatnicza",
  shippingAddress: PREVIEW_ADDRESS,
}

const PREVIEW_ORDER_ITEMS = [
  {
    imageUrl: PREVIEW_IMAGE,
    price: 24_900,
    productUrl: "http://localhost:3000/products/bransoletka-aurora",
    qty: 1,
    title: "Bransoletka Aurora",
  },
  {
    imageUrl: PREVIEW_IMAGE,
    price: 18_900,
    productUrl: "http://localhost:3000/products/kolczyki-luna",
    qty: 2,
    title: "Kolczyki Luna",
  },
]

const PREVIEW_GUEST_CTA = {
  href: "http://localhost:3000/auth/sign-up",
  isGuest: true,
  label: "Załóż konto i śledź zamówienie",
}

const PREVIEW_CUSTOMER_CTA = {
  href: "http://localhost:3000/pl/konto/zamowienia/abc123",
  isGuest: false,
  label: "Zobacz zamówienie",
}

export const EMAIL_PREVIEWS = {
  "account-deleted": {
    element: async (locale) => (
      <AccountDeleted
        locale={locale}
        messages={await loadNamespace<typeof accountDeletedMessages>({ locale, namespace: ACCOUNT_DELETED_NAMESPACE })}
        name={PREVIEW_NAME}
        storefrontUrl={`https://martebizuteria.pl/${locale}`}
      />
    ),
    label: "Account deleted",
  },
  "change-email": {
    element: async (locale) => (
      <ChangeEmail
        locale={locale}
        messages={await loadNamespace<typeof changeEmailMessages>({ locale, namespace: CHANGE_EMAIL_NAMESPACE })}
        name={PREVIEW_NAME}
        verificationUrl={`https://martebizuteria.pl/${locale}/auth/verify-email?token=12345`}
      />
    ),
    label: "Change email",
  },
  "order-confirmation": {
    element: async (locale) => (
      <OrderConfirmation
        accountCta={PREVIEW_GUEST_CTA}
        currency="PLN"
        details={PREVIEW_ORDER_CONFIRMATION_DETAILS}
        items={PREVIEW_ORDER_ITEMS}
        locale={locale}
        messages={await loadNamespace<typeof orderConfirmationMessages>({ locale, namespace: ORDER_CONFIRMATION_NAMESPACE })}
        discountTotal={0}
        orderNumber={PREVIEW_ORDER_NUMBER}
        shippingTotal={1900}
        subtotal={62_700}
        taxBasisPoints={STANDARD_VAT_BASIS_POINTS}
        taxTotal={12_080}
        total={64_600}
      />
    ),
    label: "Order confirmation",
  },
  "order-shipped": {
    element: async (locale) => (
      <OrderShipped
        accountCta={PREVIEW_CUSTOMER_CTA}
        details={{
          deliveryMethod: PREVIEW_ORDER_CONFIRMATION_DETAILS.deliveryMethod,
          estimatedDelivery: PREVIEW_ORDER_CONFIRMATION_DETAILS.estimatedDelivery,
          shippingAddress: PREVIEW_ADDRESS,
          trackingNumber: PREVIEW_TRACKING_NUMBER,
          trackingUrl: undefined,
        }}
        locale={locale}
        messages={await loadNamespace<typeof orderShippedMessages>({ locale, namespace: ORDER_SHIPPED_NAMESPACE })}
        orderNumber={PREVIEW_ORDER_NUMBER}
      />
    ),
    label: "Order shipped",
  },
  "reset-password": {
    element: async (locale) => (
      <ResetPassword
        locale={locale}
        messages={await loadNamespace<typeof resetPasswordMessages>({ locale, namespace: RESET_PASSWORD_NAMESPACE })}
        name={PREVIEW_NAME}
        resetPasswordUrl={`https://martebizuteria.pl/${locale}/auth/reset-password?token=12345`}
      />
    ),
    label: "Reset password",
  },
  "verify-email": {
    element: async (locale) => (
      <VerifyEmail
        locale={locale}
        messages={await loadNamespace<typeof verifyEmailMessages>({ locale, namespace: VERIFY_EMAIL_NAMESPACE })}
        name={PREVIEW_NAME}
        verificationUrl={`https://martebizuteria.pl/${locale}/auth/verify-email?token=12345`}
      />
    ),
    label: "Verify email",
  },
} satisfies Record<string, EmailPreview>

export type EmailPreviewSlug = keyof typeof EMAIL_PREVIEWS

export const isEmailPreviewSlug = (value: string): value is EmailPreviewSlug => SLUGS.includes(value)

export const renderEmailPreview = async (slug: EmailPreviewSlug, locale: SupportedLocale, plainText: boolean): Promise<string> =>
  render(
    await EMAIL_PREVIEWS[slug].element(locale),
    plainText
      ? {
          plainText: true,
        }
      : {
          plainText: false,
        },
  )

interface EmailPreview {
  readonly element: (locale: SupportedLocale) => Promise<ReactElement>
  readonly label: string
}

const SLUGS: string[] = Object.keys(EMAIL_PREVIEWS)
