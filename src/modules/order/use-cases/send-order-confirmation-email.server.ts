import { type ReactElement, createElement } from "react"

import { type Attachment } from "resend"
import type StripeType from "stripe"
import { createTranslator } from "use-intl"

import { embedEmailImages } from "~/src/integrations/cloudflare-r2/media.email.server"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { stripe } from "~/src/integrations/stripe/stripe.server"
import { resolveStripeObjectId } from "~/src/integrations/stripe/stripe.utils"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getFulfillmentTimeAttributesByVariantId } from "~/src/modules/attribute-on-product/attribute-on-product.accessors"
import { type FulfillmentTimeAttribute } from "~/src/modules/attribute-on-product/attribute-on-product.types"
import { getCheckoutEmailContext } from "~/src/modules/checkout/checkout.accessors"
import { type FulfillmentLine } from "~/src/modules/checkout/checkout.types"
import { resolveCheckoutSessionCurrency, resolveCheckoutSessionLocale } from "~/src/modules/checkout/checkout.utils"
import { type CheckoutFulfillmentLine } from "~/src/modules/checkout/checkout.zod"
import { readCheckoutSessionLines } from "~/src/modules/checkout/use-cases/read-checkout-session-lines.server"
import { loadWithdrawalFormAttachment } from "~/src/modules/order-withdrawal/use-cases/load-withdrawal-form-attachment.server"
import { getOrderTotalsForEmail } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import { type OrderLineFulfillmentTime } from "~/src/modules/order/order.types"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/use-cases/deliver-order-email.server"
import { formatProductAttributeValueForDisplay } from "~/src/modules/product-attribute/product-attribute.utils"
import { readSellerDetails } from "~/src/modules/store-setting/store-setting.accessors"

import { resolveDeploymentOrigin } from "~/src/lib/request"

import type orderConfirmationMessages from "~/messages/en-US/emails.order-confirmation.json"
import { ORDER_CONFIRMATION_NAMESPACE, OrderConfirmation } from "~/src/presentation/emails/order-confirmation"
import {
  buildOrderAccountCta,
  buildOrderConfirmationDetails,
  buildOrderConfirmationItems,
  buildOrderLegalLinks,
} from "~/src/presentation/emails/order-email-content"

export const resolveOrderLineFulfillmentTimes = (
  lines: readonly FulfillmentLine[],
  attributesByVariantId: ReadonlyMap<string, FulfillmentTimeAttribute>,
  locale: SupportedLocale,
): OrderLineFulfillmentTime[] =>
  lines.map((line) => {
    const attribute = attributesByVariantId.get(line.variantId)

    return {
      time:
        attribute === undefined
          ? undefined
          : formatProductAttributeValueForDisplay(attribute.type, attribute.value, {
              allowedValues: attribute.allowedValues,
              locale,
              unit: attribute.unit,
            }),
      title: line.title,
    }
  })

export const resolveStripePaymentMethodLabel = async (
  session: StripeType.Checkout.Session,
  messages: typeof orderConfirmationMessages,
): Promise<string> => {
  const labels = messages.paymentMethods
  const fallback = messages.paymentMethodUnknown
  const paymentIntentId = resolveStripeObjectId(session.payment_intent)
  if (paymentIntentId === undefined) {
    return fallback
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId, {
      expand: ["payment_method"],
    })

    const paymentMethod = paymentIntent.payment_method
    if (paymentMethod === null || typeof paymentMethod === "string") {
      return fallback
    }

    if (paymentMethod.type === "card") {
      return labels.card
    }

    if (paymentMethod.type === "blik") {
      return labels.blik
    }

    if (paymentMethod.type === "p24") {
      return labels.p24
    }

    return fallback
  } catch {
    return fallback
  }
}

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
    attachments: [await loadWithdrawalFormAttachment(seller, origin), ...inlineImages.attachments],
    email: placedOrder.recipient,
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
