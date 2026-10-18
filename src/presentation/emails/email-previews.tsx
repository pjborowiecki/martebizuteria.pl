import { type ReactElement } from "react"

import { render } from "react-email"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { STANDARD_VAT_BASIS_POINTS } from "~/src/modules/_core/constants/tax"
import { describeOrderFulfillmentTime } from "~/src/modules/order/order.fulfillment-time.utils"
import { readSellerDetails } from "~/src/modules/store-setting/store-setting.accessors"
import { type StoreSetting } from "~/src/modules/store-setting/store-setting.types"

import type accountDeletedMessages from "~/messages/en-US/emails.account-deleted.json"
import type changeEmailMessages from "~/messages/en-US/emails.change-email.json"
import type emailChangedMessages from "~/messages/en-US/emails.email-changed.json"
import type incidentAlertMessages from "~/messages/en-US/emails.incident-alert.json"
import type newOrderMessages from "~/messages/en-US/emails.new-order.json"
import type newsletterAlreadySubscribedMessages from "~/messages/en-US/emails.newsletter-already-subscribed.json"
import type orderCancelledMessages from "~/messages/en-US/emails.order-cancelled.json"
import type orderConfirmationMessages from "~/messages/en-US/emails.order-confirmation.json"
import type orderDeliveredMessages from "~/messages/en-US/emails.order-delivered.json"
import type orderInProgressMessages from "~/messages/en-US/emails.order-in-progress.json"
import type orderRefundedMessages from "~/messages/en-US/emails.order-refunded.json"
import type orderShippedMessages from "~/messages/en-US/emails.order-shipped.json"
import type orderTrackingMessages from "~/messages/en-US/emails.order-tracking.json"
import type orderWithdrawalMessages from "~/messages/en-US/emails.order-withdrawal.json"
import type passwordChangedMessages from "~/messages/en-US/emails.password-changed.json"
import type paymentFailedMessages from "~/messages/en-US/emails.payment-failed.json"
import type resetPasswordMessages from "~/messages/en-US/emails.reset-password.json"
import type verifyEmailMessages from "~/messages/en-US/emails.verify-email.json"
import { ACCOUNT_DELETED_NAMESPACE, AccountDeleted } from "~/src/presentation/emails/account-deleted"
import { CHANGE_EMAIL_NAMESPACE, ChangeEmail, SUPPORT_EMAIL_CHANGE_NAMESPACE } from "~/src/presentation/emails/change-email"
import { EMAIL_CHANGED_NAMESPACE, EmailChanged } from "~/src/presentation/emails/email-changed"
import { INCIDENT_ALERT_NAMESPACE, IncidentAlert } from "~/src/presentation/emails/incident-alert"
import { NEW_ORDER_NAMESPACE, NewOrder } from "~/src/presentation/emails/new-order"
import {
  NEWSLETTER_ALREADY_SUBSCRIBED_NAMESPACE,
  NewsletterAlreadySubscribed,
} from "~/src/presentation/emails/newsletter-already-subscribed"
import { ORDER_CANCELLED_NAMESPACE, OrderCancelled } from "~/src/presentation/emails/order-cancelled"
import { ORDER_CONFIRMATION_NAMESPACE, OrderConfirmation } from "~/src/presentation/emails/order-confirmation"
import { ORDER_DELIVERED_NAMESPACE, OrderDelivered } from "~/src/presentation/emails/order-delivered"
import { ORDER_IN_PROGRESS_NAMESPACE, OrderInProgress } from "~/src/presentation/emails/order-in-progress"
import { ORDER_REFUNDED_NAMESPACE, OrderRefunded } from "~/src/presentation/emails/order-refunded"
import { ORDER_SHIPPED_NAMESPACE, OrderShipped } from "~/src/presentation/emails/order-shipped"
import { ORDER_TRACKING_NAMESPACE, OrderTrackingUpdate } from "~/src/presentation/emails/order-tracking"
import { ORDER_WITHDRAWAL_NAMESPACE, OrderWithdrawalNotice, OrderWithdrawalReceived } from "~/src/presentation/emails/order-withdrawal"
import { PASSWORD_CHANGED_NAMESPACE, PasswordChanged } from "~/src/presentation/emails/password-changed"
import { PAYMENT_FAILED_NAMESPACE, PaymentFailed } from "~/src/presentation/emails/payment-failed"
import { RESET_PASSWORD_NAMESPACE, ResetPassword } from "~/src/presentation/emails/reset-password"
import { VERIFY_EMAIL_NAMESPACE, VerifyEmail } from "~/src/presentation/emails/verify-email"

const PREVIEW_NAME = "Jane Doe"

const PREVIEW_ORDER_NUMBER = "MRT-2026-00042"

const PREVIEW_IMAGE = "https://pub-a9ce13f98e72423eb72107a4e696f2e0.r2.dev/placeholder.svg"

const PREVIEW_ADDRESS = "Anna Kowalska\nul. Mokotowska 12/4\n00-640 Warszawa, Polska\n+48 600 123 456"

const PREVIEW_TRACKING_NUMBER = "00259007123456789012"

const PREVIEW_TRACKING = {
  carrier: "InPost",
  trackingNumber: PREVIEW_TRACKING_NUMBER,
  trackingUrl: `https://inpost.pl/sledzenie-przesylek?number=${PREVIEW_TRACKING_NUMBER}`,
}

const PREVIEW_COMPANY_INVOICE = "Pracownia Złotnicza sp. z o.o.\nNIP 5260001246"

const PREVIEW_ORDER_TOTAL = 64_600

const PREVIEW_ORDER_CONFIRMATION_DETAILS = {
  billingAddress: "Tak jak adres dostawy",
  companyInvoice: PREVIEW_COMPANY_INVOICE,
  deliveryMethod: "Kurier InPost",
  destination: { address: PREVIEW_ADDRESS, kind: "address" },
  paymentMethod: "Karta płatnicza",
} as const

const PREVIEW_LOCKER_DESTINATION = {
  kind: "locker",
  locker: "WAW01M\nPrzy wejściu do sklepu\nul. Mokotowska 1\n00-640 Warszawa",
  recipient: "Anna Kowalska\n+48 600 123 456",
} as const

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

const PREVIEW_SHOP_ORDER_ITEMS = [
  {
    id: "item-aurora",
    quantity: 1,
    sku: "MRT-0101",
    title: "Bransoletka Aurora",
    totalMinorUnits: 24_900,
    unitPriceMinorUnits: 24_900,
    variantTitle: undefined,
  },
  {
    id: "item-luna",
    quantity: 2,
    sku: "MRT-0102",
    title: "Kolczyki Luna",
    totalMinorUnits: 37_800,
    unitPriceMinorUnits: 18_900,
    variantTitle: "Srebro",
  },
]

const PREVIEW_SHOP_ORDER_DETAILS = {
  companyInvoice: `${PREVIEW_COMPANY_INVOICE}\nul. Mokotowska 12/4\n00-640 Warszawa, Polska`,
  customer: "Anna Kowalska\nanna.kowalska@example.com\n+48 600 123 456",
  customerNote: "Proszę o zapakowanie na prezent.",
  deliveryMethod: PREVIEW_ORDER_CONFIRMATION_DETAILS.deliveryMethod,
  destination: { address: "ul. Mokotowska 12/4\n00-640 Warszawa, Polska", kind: "address" },
} as const

const PREVIEW_LEGAL_LINKS = {
  exchangesAndReturns: "http://localhost:3000/exchanges-and-returns",
  privacyPolicy: "http://localhost:3000/privacy-policy",
  termsOfService: "http://localhost:3000/terms-of-service",
  withdrawal: `http://localhost:3000/withdraw-from-contract?order=${PREVIEW_ORDER_NUMBER}`,
}

const PREVIEW_GUEST_CTA = {
  href: "http://localhost:3000/auth/sign-up",
  isGuest: true,
  label: "Załóż konto i śledź zamówienie",
}

const PREVIEW_WITHDRAWAL_STATEMENT = {
  consumerName: "Anna Kowalska",
  email: "anna.kowalska@example.com",
  items: "Kolczyki Luna — Srebro × 2",
  reason: "Rozmiar nie pasuje.",
  scope: "items",
  submittedAt: new Date("2026-10-10T12:30:00.000Z"),
} as const

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
  "email-changed": {
    element: async (locale, seller) => (
      <EmailChanged
        locale={locale}
        maskedEmail="j***@e***.com"
        messages={await loadNamespace<typeof emailChangedMessages>({ locale, namespace: EMAIL_CHANGED_NAMESPACE })}
        name={PREVIEW_NAME}
        seller={seller}
      />
    ),
    label: "Email changed, to the old address",
  },
  "incident-alert": {
    element: async (locale) => (
      <IncidentAlert
        environment="production"
        incident={{
          detail: "546,00 PLN — anna.kowalska@example.com — No payment carries Checkout Session cs_live_a1B2c3D4e5",
          kind: "paidCheckoutWithoutOrder",
          reference: "cs_live_a1B2c3D4e5",
        }}
        locale={locale}
        messages={await loadNamespace<typeof incidentAlertMessages>({ locale, namespace: INCIDENT_ALERT_NAMESPACE })}
      />
    ),
    label: "Incident alert for the shop",
  },
  "new-order": {
    element: async (locale) => (
      <NewOrder
        adminOrderUrl="http://localhost:3000/admin/orders/abc123"
        currency="PLN"
        details={PREVIEW_SHOP_ORDER_DETAILS}
        items={PREVIEW_SHOP_ORDER_ITEMS}
        locale={locale}
        messages={await loadNamespace<typeof newOrderMessages>({ locale, namespace: NEW_ORDER_NAMESPACE })}
        orderNumber={PREVIEW_ORDER_NUMBER}
        total={PREVIEW_ORDER_TOTAL}
      />
    ),
    label: "New order for the shop",
  },
  "newsletter-already-subscribed": {
    element: async (locale) => (
      <NewsletterAlreadySubscribed
        locale={locale}
        messages={await loadNamespace<typeof newsletterAlreadySubscribedMessages>({
          locale,
          namespace: NEWSLETTER_ALREADY_SUBSCRIBED_NAMESPACE,
        })}
        storefrontUrl={`https://martebizuteria.pl/${locale}`}
      />
    ),
    label: "Newsletter already subscribed",
  },
  "order-cancelled": {
    element: async (locale) => (
      <OrderCancelled
        accountCta={PREVIEW_CUSTOMER_CTA}
        currency="PLN"
        locale={locale}
        messages={await loadNamespace<typeof orderCancelledMessages>({ locale, namespace: ORDER_CANCELLED_NAMESPACE })}
        orderNumber={PREVIEW_ORDER_NUMBER}
        refundedAmount={PREVIEW_ORDER_TOTAL}
      />
    ),
    label: "Order cancelled",
  },
  "order-confirmation": {
    element: async (locale, seller) => {
      const messages = await loadNamespace<typeof orderConfirmationMessages>({ locale, namespace: ORDER_CONFIRMATION_NAMESPACE })

      return (
        <OrderConfirmation
          accountCta={PREVIEW_GUEST_CTA}
          currency="PLN"
          details={{
            ...PREVIEW_ORDER_CONFIRMATION_DETAILS,
            estimatedDelivery: messages.estimatedDelivery.courier,
            fulfillmentTime: describeOrderFulfillmentTime(
              PREVIEW_ORDER_ITEMS.map((item) => ({ time: undefined, title: item.title })),
              messages,
            ),
          }}
          inlineImageSources={new Map()}
          items={PREVIEW_ORDER_ITEMS}
          legalLinks={PREVIEW_LEGAL_LINKS}
          locale={locale}
          messages={messages}
          discountTotal={0}
          orderNumber={PREVIEW_ORDER_NUMBER}
          seller={seller}
          shippingTotal={1900}
          subtotal={62_700}
          taxBasisPoints={STANDARD_VAT_BASIS_POINTS}
          taxTotal={12_080}
          total={PREVIEW_ORDER_TOTAL}
        />
      )
    },
    label: "Order confirmation",
  },
  "order-delivered": {
    element: async (locale, seller) => (
      <OrderDelivered
        accountCta={PREVIEW_CUSTOMER_CTA}
        links={{
          care: "http://localhost:3000/faq",
          exchangesAndReturns: PREVIEW_LEGAL_LINKS.exchangesAndReturns,
          withdrawal: PREVIEW_LEGAL_LINKS.withdrawal,
        }}
        locale={locale}
        messages={await loadNamespace<typeof orderDeliveredMessages>({ locale, namespace: ORDER_DELIVERED_NAMESPACE })}
        orderNumber={PREVIEW_ORDER_NUMBER}
        seller={seller}
      />
    ),
    label: "Order delivered",
  },
  "order-in-progress": {
    element: async (locale) => (
      <OrderInProgress
        accountCta={PREVIEW_CUSTOMER_CTA}
        delivery={{ methodName: "Paczkomat InPost", type: "locker" }}
        locale={locale}
        messages={await loadNamespace<typeof orderInProgressMessages>({ locale, namespace: ORDER_IN_PROGRESS_NAMESPACE })}
        orderNumber={PREVIEW_ORDER_NUMBER}
      />
    ),
    label: "Order in progress",
  },
  "order-refunded": {
    element: async (locale) => (
      <OrderRefunded
        accountCta={PREVIEW_GUEST_CTA}
        currency="PLN"
        fullyRefunded={false}
        locale={locale}
        messages={await loadNamespace<typeof orderRefundedMessages>({ locale, namespace: ORDER_REFUNDED_NAMESPACE })}
        orderNumber={PREVIEW_ORDER_NUMBER}
        orderTotal={PREVIEW_ORDER_TOTAL}
        refundedAmount={18_900}
      />
    ),
    label: "Order refunded",
  },
  "order-shipped": {
    element: async (locale) => {
      const messages = await loadNamespace<typeof orderShippedMessages>({ locale, namespace: ORDER_SHIPPED_NAMESPACE })

      return (
        <OrderShipped
          accountCta={PREVIEW_CUSTOMER_CTA}
          details={{
            ...PREVIEW_TRACKING,
            deliveryMethod: "Paczkomat InPost",
            destination: PREVIEW_LOCKER_DESTINATION,
            estimatedDelivery: messages.deliveryTiming.locker.estimatedDelivery,
          }}
          locale={locale}
          messages={messages}
          orderNumber={PREVIEW_ORDER_NUMBER}
        />
      )
    },
    label: "Order shipped",
  },
  "order-tracking": {
    element: async (locale) => (
      <OrderTrackingUpdate
        accountCta={PREVIEW_CUSTOMER_CTA}
        locale={locale}
        messages={await loadNamespace<typeof orderTrackingMessages>({ locale, namespace: ORDER_TRACKING_NAMESPACE })}
        orderNumber={PREVIEW_ORDER_NUMBER}
        tracking={PREVIEW_TRACKING}
      />
    ),
    label: "Tracking number",
  },
  "order-withdrawal": {
    element: async (locale, seller) => (
      <OrderWithdrawalReceived
        locale={locale}
        messages={await loadNamespace<typeof orderWithdrawalMessages>({ locale, namespace: ORDER_WITHDRAWAL_NAMESPACE })}
        orderNumber={PREVIEW_ORDER_NUMBER}
        seller={seller}
        statement={PREVIEW_WITHDRAWAL_STATEMENT}
      />
    ),
    label: "Withdrawal acknowledgement",
  },
  "order-withdrawal-notice": {
    element: async (locale) => (
      <OrderWithdrawalNotice
        adminOrderUrl="http://localhost:3000/admin/orders/abc123"
        locale={locale}
        messages={await loadNamespace<typeof orderWithdrawalMessages>({ locale, namespace: ORDER_WITHDRAWAL_NAMESPACE })}
        orderNumber={PREVIEW_ORDER_NUMBER}
        statement={PREVIEW_WITHDRAWAL_STATEMENT}
      />
    ),
    label: "Withdrawal for the shop",
  },
  "password-changed": {
    element: async (locale) => (
      <PasswordChanged
        locale={locale}
        messages={await loadNamespace<typeof passwordChangedMessages>({ locale, namespace: PASSWORD_CHANGED_NAMESPACE })}
        name={PREVIEW_NAME}
        signInUrl={`https://martebizuteria.pl/${locale}/auth/sign-in`}
      />
    ),
    label: "Password changed",
  },
  "payment-failed": {
    element: async (locale) => (
      <PaymentFailed
        amount={PREVIEW_ORDER_TOTAL}
        currency="PLN"
        items={PREVIEW_ORDER_ITEMS}
        locale={locale}
        messages={await loadNamespace<typeof paymentFailedMessages>({ locale, namespace: PAYMENT_FAILED_NAMESPACE })}
        shopUrl={`http://localhost:3000/${locale}/products`}
      />
    ),
    label: "Payment failed",
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
  "support-email-change": {
    element: async (locale) => (
      <ChangeEmail
        locale={locale}
        messages={await loadNamespace<typeof changeEmailMessages>({ locale, namespace: SUPPORT_EMAIL_CHANGE_NAMESPACE })}
        name={PREVIEW_NAME}
        verificationUrl={`https://martebizuteria.pl/api/auth/verify-email?token=12345&callbackURL=%2F${locale}%2Faccount%2Fprofile`}
      />
    ),
    label: "Change email, started by customer care",
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
    await EMAIL_PREVIEWS[slug].element(locale, await readSellerDetails()),
    plainText
      ? {
          plainText: true,
        }
      : {
          plainText: false,
        },
  )

interface EmailPreview {
  readonly element: (locale: SupportedLocale, seller: StoreSetting["sellerDetails"]) => Promise<ReactElement>
  readonly label: string
}

const SLUGS: string[] = Object.keys(EMAIL_PREVIEWS)
