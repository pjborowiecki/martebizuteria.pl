import { type ReactElement, createElement } from "react"

import { type Attachment } from "resend"
import type StripeType from "stripe"
import { createTranslator } from "use-intl"

import { embedEmailImages } from "~/src/integrations/cloudflare-r2/media.email.server"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getFulfillmentTimeAttributesByVariantId } from "~/src/modules/attribute-on-product/attribute-on-product.server"
import {
  type CheckoutFulfillmentLine,
  resolveCheckoutSessionCurrency,
  resolveCheckoutSessionLocale,
} from "~/src/modules/checkout/checkout-metadata.zod"
import { getCheckoutEmailContext } from "~/src/modules/checkout/checkout.accessors"
import { readCheckoutSessionLines } from "~/src/modules/checkout/checkout.session-lines.server"
import { loadWithdrawalFormAttachment } from "~/src/modules/order-withdrawal/order-withdrawal.form.server"
import { getOrderTotalsForEmail } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/order.email-delivery.server"
import {
  buildOrderAccountCta,
  buildOrderConfirmationDetails,
  buildOrderConfirmationItems,
  buildOrderLegalLinks,
  resolveStripePaymentMethodLabel,
} from "~/src/modules/order/order.email.utils"
import { resolveOrderLineFulfillmentTimes } from "~/src/modules/order/order.fulfillment-time.utils"
import { readSellerDetails } from "~/src/modules/store-setting/store-setting.accessors"

import { resolveDeploymentOrigin } from "~/src/lib/request"

import type orderConfirmationMessages from "~/messages/en-US/emails.order-confirmation.json"
import { ORDER_CONFIRMATION_NAMESPACE, OrderConfirmation } from "~/src/presentation/emails/order-confirmation"

interface OrderConfirmationEmailPayload {
  readonly attachments: Attachment[]
  readonly email: string
  readonly locale: SupportedLocale
  readonly react: ReactElement
  readonly subject: string
}

const buildOrderConfirmationEmailPayload = async (
  session: StripeType.Checkout.Session,
  order: Readonly<{ currency: string; lines: CheckoutFulfillmentLine[]; orderId: string }>,
  origin: string,
): Promise<OrderConfirmationEmailPayload | undefined> => {
  const placedOrder = await getOrderTotalsForEmail(order.orderId)
  if (placedOrder === undefined) {
    return undefined
  }

  const locale = resolveCheckoutSessionLocale(session)
  const checkoutId = session.metadata?.["checkoutId"]
  const checkoutContext = typeof checkoutId === "string" && checkoutId !== "" ? await getCheckoutEmailContext(checkoutId) : undefined
  const [messages, seller] = await Promise.all([
    loadNamespace<typeof orderConfirmationMessages>({ locale, namespace: ORDER_CONFIRMATION_NAMESPACE }),
    readSellerDetails(),
  ])
  const paymentMethod = await resolveStripePaymentMethodLabel(session, messages)
  const fulfillmentTimeAttributes = await getFulfillmentTimeAttributesByVariantId(order.lines.map((line) => line.variantId))
  const details = buildOrderConfirmationDetails({
    context:
      checkoutContext === undefined
        ? undefined
        : {
            billingAddress: checkoutContext.billingAddress,
            billingAddressId: checkoutContext.billingAddressId,
            billingCompanyName: checkoutContext.billingCompanyName,
            billingNip: checkoutContext.billingNip,
            customerNote: checkoutContext.customerNote,
            deliveryMethod: checkoutContext.deliveryMethod,
            lockerId: checkoutContext.lockerId,
            lockerPoint: checkoutContext.lockerPoint,
            shippingAddress: checkoutContext.shippingAddress,
            shippingAddressId: checkoutContext.shippingAddressId,
          },
    fulfillmentTimes: resolveOrderLineFulfillmentTimes(order.lines, fulfillmentTimeAttributes, locale),
    locale,
    messages,
    paymentMethod,
  })

  const emailItems = buildOrderConfirmationItems(order.lines, locale, origin)
  const inlineImages = await embedEmailImages(emailItems.map((item) => item.imageUrl))
  const accountCta = buildOrderAccountCta({ isGuest: placedOrder.userId === null, locale, messages, orderId: order.orderId, origin })
  const { orderNumber } = placedOrder

  return {
    attachments: [await loadWithdrawalFormAttachment(origin), ...inlineImages.attachments],
    email: placedOrder.email,
    locale,
    react: createElement(OrderConfirmation, {
      accountCta,
      currency: order.currency,
      details,
      discountTotal: placedOrder.discountTotal,
      inlineImageSources: inlineImages.sources,
      items: emailItems,
      legalLinks: buildOrderLegalLinks(origin, locale, orderNumber),
      locale,
      messages,
      orderNumber,
      seller,
      shippingTotal: placedOrder.shippingTotal,
      subtotal: placedOrder.subtotal,
      taxBasisPoints: placedOrder.taxBasisPoints,
      taxTotal: placedOrder.taxTotal,
      total: placedOrder.total,
    }),
    subject: createTranslator({ locale, messages })("subject"),
  }
}

const ORDER_CONFIRMATION_LABEL = "Order confirmation"

const attemptOrderConfirmationEmail = async (
  session: StripeType.Checkout.Session,
  orderId: string,
  idempotencyKey: string,
): Promise<OrderEmailOutcome> => {
  if (session.return_url === undefined) {
    return { failure: "The Stripe session has no return URL to link the email to", label: ORDER_CONFIRMATION_LABEL }
  }

  const order = { currency: resolveCheckoutSessionCurrency(session), lines: await readCheckoutSessionLines(session), orderId }
  const payload = await buildOrderConfirmationEmailPayload(session, order, resolveDeploymentOrigin(session.return_url))
  if (payload === undefined) {
    return { failure: `Order ${orderId} was not found`, label: ORDER_CONFIRMATION_LABEL }
  }

  const failure = await sendEmail({
    attachments: payload.attachments,
    idempotencyKey,
    react: payload.react,
    subject: payload.subject,
    to: payload.email,
  })

  return { failure, label: `${ORDER_CONFIRMATION_LABEL} → ${payload.email}` }
}

export const sendOrderConfirmationEmail = (session: StripeType.Checkout.Session, orderId: string): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => attemptOrderConfirmationEmail(session, orderId, idempotencyKey), {
    idempotencyKey: `${ORDER_EMAIL_KIND.CONFIRMATION}/${orderId}`,
    label: ORDER_CONFIRMATION_LABEL,
    orderEmail: { kind: ORDER_EMAIL_KIND.CONFIRMATION },
    orderId,
  })
