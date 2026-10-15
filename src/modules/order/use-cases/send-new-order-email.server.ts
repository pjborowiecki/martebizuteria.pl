import { env } from "cloudflare:workers"

import { createElement } from "react"

import { createTranslator } from "use-intl"

import { sendEmail } from "~/src/integrations/resend/resend.send"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { getAdminOrderDetailRow, getAdminOrderItemRows } from "~/src/modules/order/order.accessors"
import { ORDER_EMAIL_KIND } from "~/src/modules/order/order.constants"
import {
  describeOrderLocker,
  mapAdminOrderDetailItem,
  resolveAdminOrderDetailAddresses,
  resolveOrderLocker,
} from "~/src/modules/order/order.detail.utils"
import { formatOrderAddressLocality } from "~/src/modules/order/order.display.utils"
import { type OrderEmailOutcome, deliverOrderEmail } from "~/src/modules/order/order.email-delivery.server"
import { describeCompanyInvoice, resolveDeliveryMethodLabel } from "~/src/modules/order/order.email.utils"
import { type Order } from "~/src/modules/order/order.types"

import { resolveDeploymentOrigin } from "~/src/lib/request"
import { buildLocalizedUrl } from "~/src/lib/seo"

import type newOrderMessages from "~/messages/en-US/emails.new-order.json"
import { NEW_ORDER_NAMESPACE, NewOrder, type NewOrderDetails } from "~/src/presentation/emails/new-order"
import { ROUTES } from "~/src/routes"

const NEW_ORDER_LABEL = "New order notification"

const joinLines = (lines: readonly (string | undefined)[]): string =>
  lines.filter((line): line is string => line !== undefined && line.trim() !== "").join("\n")

const describeAddress = (address: Order["adminOrderDetailAddress"]): string =>
  joinLines([address.line1, address.line2, formatOrderAddressLocality(address, I18N.DEFAULT_LOCALE)])

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
  const locker = resolveOrderLocker({
    deliveryType: orderRow.deliveryMethod?.type,
    lockerId: orderRow.lockerId,
    lockerPoint: orderRow.lockerPoint,
  })

  return {
    companyInvoice: describeInvoicedCompany(orderRow, billingAddress, messages),
    customer: joinLines([shippingAddress?.name, orderRow.email, shippingAddress?.phone]),
    customerNote: customerNote === undefined || customerNote === "" ? undefined : customerNote,
    deliveryMethod: resolveDeliveryMethodLabel(orderRow.deliveryMethod, messages.unavailable),
    destination:
      locker === undefined
        ? { address: shippingAddress === undefined ? messages.unavailable : describeAddress(shippingAddress), kind: "address" }
        : { kind: "locker", locker: describeOrderLocker(locker).join("\n"), recipient: undefined },
  }
}

const attemptNewOrderEmail = async (
  { orderId, returnUrl }: Readonly<NewOrderNotice>,
  idempotencyKey: string,
): Promise<OrderEmailOutcome> => {
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
    idempotencyKey,
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

export const sendNewOrderEmail = (orderId: string, returnUrl: string | undefined): Promise<boolean> =>
  deliverOrderEmail((idempotencyKey) => attemptNewOrderEmail({ orderId, returnUrl }, idempotencyKey), {
    idempotencyKey: `${ORDER_EMAIL_KIND.NEW_ORDER}/${orderId}`,
    label: NEW_ORDER_LABEL,
    orderEmail: { kind: ORDER_EMAIL_KIND.NEW_ORDER },
    orderId,
  })

type AdminOrderDetailRow = NonNullable<Awaited<ReturnType<typeof getAdminOrderDetailRow>>>

interface NewOrderNotice {
  readonly orderId: string
  readonly returnUrl: string | undefined
}
