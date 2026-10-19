import { type CustomerOrderItemRow, type Order } from "~/src/modules/order/order.types"
import { resolveCustomerAccountOrderStatus } from "~/src/modules/order/order.utils"

import { getProductImageUrl } from "~/src/lib/image"

const NO_ITEMS = 0

const SINGLE_ITEM = 1

const mapOrderItemRow = (row: CustomerOrderItemRow): Order["customerOrderItem"] => ({
  handle: row.handle ?? undefined,
  id: row.id,
  image: row.thumbnail === null || row.thumbnail === "" ? undefined : getProductImageUrl(row.thumbnail),
  lineTotalMinorUnits: row.total,
  name: row.title,
  qty: row.quantity,
  unitPriceMinorUnits: row.unitPrice ?? Math.round(row.total / Math.max(row.quantity, SINGLE_ITEM)),
  variantTitle: row.variantTitle ?? undefined,
})

const countOrderItems = (items: readonly CustomerOrderItemRow[]): number => items.reduce((total, item) => total + item.quantity, NO_ITEMS)

export const mapCustomerOrderSummaryRow = (
  orderRow: {
    readonly createdAt: Date
    readonly currencyCode: string
    readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
    readonly id: string
    readonly orderNumber: string
    readonly status: Order["select"]["status"]
    readonly total: number
  },
  items: readonly CustomerOrderItemRow[],
): Order["customerOrderSummary"] => ({
  createdAt: orderRow.createdAt,
  currencyCode: orderRow.currencyCode,
  filterStatus: resolveCustomerAccountOrderStatus(orderRow.status, orderRow.fulfillmentStatus),
  fulfillmentStatus: orderRow.fulfillmentStatus,
  id: orderRow.id,
  itemCount: countOrderItems(items),
  items: items.map((item) => mapOrderItemRow(item)),
  orderNumber: orderRow.orderNumber,
  status: orderRow.status,
  totalMinorUnits: orderRow.total,
})
