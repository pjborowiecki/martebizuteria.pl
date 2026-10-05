import { env } from "cloudflare:workers"

import { createElement } from "react"

import { createTranslator } from "use-intl"

import { describeCompanyInvoice, resolveDeliveryMethodLabel } from "~/src/integrations/resend/order-confirmation.utils"
import { type OrderEmailOutcome, recordOrderEmailAttempt } from "~/src/integrations/resend/order-email.outcome.server"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getAdminOrderDetailRow, getAdminOrderItemRows } from "~/src/modules/order/order.accessors"
import { mapAdminOrderDetailItem, resolveAdminOrderDetailAddresses } from "~/src/modules/order/order.detail.utils"
import { type Order } from "~/src/modules/order/order.types"

import { resolveDeploymentOrigin } from "~/src/lib/request"
import { buildLocalizedUrl } from "~/src/lib/seo"

import type newOrderMessages from "~/messages/en-US/emails.new-order.json"
import { NEW_ORDER_NAMESPACE, NewOrder, type NewOrderDetails } from "~/src/presentation/emails/new-order"
import { ROUTES } from "~/src/routes"

const NEW_ORDER_LABEL = "New order notification"

const joinLines = (lines: readonly (string | undefined)[]): string =>
  lines.filter((line): line is string => line !== undefined && line.trim() !== "").join("\n")

const describeAddress = ({ city, countryCode, line1, line2, postalCode }: Order["adminOrderDetailAddress"]): string =>
  joinLines([line1, line2, postalCode === undefined ? city : `${postalCode} ${city}`, countryCode])

const describeInvoicedCompany = (
  orderRow: AdminOrderDetailRow,
  billingAddress: Order["adminOrderDetailAddress"] | undefined,
  messages: typeof newOrderMessages,
): string | undefined => {
  const company = describeCompanyInvoice(orderRow, messages.nipLabel)

  return company === undefined
    ? undefined
    : joinLines([company, billingAddress === undefined ? undefined : describeAddress(billingAddress)])
}

const buildNewOrderDetails = (orderRow: AdminOrderDetailRow, messages: typeof newOrderMessages): NewOrderDetails => {
  const { billingAddress, shippingAddress } = resolveAdminOrderDetailAddresses(orderRow)
  const customerNote = orderRow.customerNote?.trim()

  return {
    companyInvoice: describeInvoicedCompany(orderRow, billingAddress, messages),
    customer: joinLines([shippingAddress?.name, orderRow.email, shippingAddress?.phone]),
    customerNote: customerNote === undefined || customerNote === "" ? undefined : customerNote,
    deliveryMethod: resolveDeliveryMethodLabel(
      { deliveryMethod: orderRow.deliveryMethod, lockerId: orderRow.lockerId },
      messages.unavailable,
    ),
    shippingAddress: shippingAddress === undefined ? messages.unavailable : describeAddress(shippingAddress),
  }
}

const sendNewOrderEmail = async ({ orderId, returnUrl }: Readonly<NewOrderNotice>): Promise<OrderEmailOutcome> => {
  if (returnUrl === undefined) {
    return { failure: "The Stripe session has no return URL to link the email to", label: NEW_ORDER_LABEL }
  }

  const origin = resolveDeploymentOrigin(returnUrl)
  const [orderRow, itemRows] = await Promise.all([getAdminOrderDetailRow(orderId), getAdminOrderItemRows(orderId)])
  if (orderRow === undefined) {
    return { failure: "The order could not be found", label: NEW_ORDER_LABEL }
  }

  const locale = I18N.DEFAULT_LOCALE
  const messages = await loadNamespace<typeof newOrderMessages>({ locale, namespace: NEW_ORDER_NAMESPACE })
  const adminOrderUrl = buildLocalizedUrl(origin, ROUTES.ADMIN_ORDER.replace("$orderId", orderId), locale)
  const failure = await sendEmail({
    react: createElement(NewOrder, {
      adminOrderUrl,
      currency: orderRow.currencyCode,
      details: buildNewOrderDetails(orderRow, messages),
      items: itemRows.map((row) => mapAdminOrderDetailItem(row)),
      locale,
      messages,
      orderNumber: orderRow.orderNumber,
      total: orderRow.total,
    }),
    subject: createTranslator({ locale, messages })("subject", { orderNumber: orderRow.orderNumber }),
    to: env.RESEND_EMAIL_FROM,
  })

  return { failure, label: `${NEW_ORDER_LABEL} → ${env.RESEND_EMAIL_FROM}` }
}

export const notifyShopOfNewOrder = (orderId: string, returnUrl: string | undefined): Promise<boolean> =>
  recordOrderEmailAttempt(sendNewOrderEmail({ orderId, returnUrl }), { label: NEW_ORDER_LABEL, orderId })

type AdminOrderDetailRow = NonNullable<Awaited<ReturnType<typeof getAdminOrderDetailRow>>>

interface NewOrderNotice {
  readonly orderId: string
  readonly returnUrl: string | undefined
}
