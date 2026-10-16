import { getAdminOrderDestinationRows, getAdminOrderItemCountRows } from "~/src/modules/order/order.accessors"
import { describeOrderDestination } from "~/src/modules/order/order.detail.utils"
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils"
import { type Order } from "~/src/modules/order/order.types"

type AdminOrderListRow = Omit<Parameters<typeof toAdminOrderListItem>[0], "itemCount"> & {
  readonly billingCompanyName: string | null
  readonly billingNip: string | null
}

export const loadAdminOrderListItems = async (rows: readonly AdminOrderListRow[]): Promise<Order["adminListItem"][]> => {
  if (rows.length === 0) {
    return []
  }

  const orderIds = rows.map((row) => row.id)
  const [itemCountRows, destinationRows] = await Promise.all([getAdminOrderItemCountRows(orderIds), getAdminOrderDestinationRows(orderIds)])
  const itemCounts = new Map(itemCountRows.map((row) => [row.orderId, row.itemCount]))
  const destinations = new Map(destinationRows.map((row) => [row.id, describeOrderDestination(row)]))

  return rows.map((row) => ({
    ...toAdminOrderListItem({ ...row, itemCount: itemCounts.get(row.id) ?? 0 }),
    billingCompanyName: row.billingCompanyName ?? undefined,
    billingNip: row.billingNip ?? undefined,
    destination: destinations.get(row.id),
  }))
}
