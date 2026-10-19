import { describe, expect, it } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { mapAuditLogToActivityItem } from "~/src/modules/audit-log/audit-log.utils"

const ORDER_ID = "0195b6f4-1111-7000-8000-000000000001"

const ORDER_NUMBERS: ReadonlyMap<string, string> = new Map([[ORDER_ID, "MRT-2026-00001"]])

describe("mapAuditLogToActivityItem", () => {
  const auditRow = { action: AUDIT_LOG_ACTION.AUTH_LOGIN, createdAt: new Date(2024, 4, 1), detail: null, metadata: null }

  it.each([
    [AUDIT_LOG_ACTION.AUTH_LOGIN, "loginSuccess"],
    [AUDIT_LOG_ACTION.AUTH_LOGOUT, "logout"],
    [AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED, "loginFailed"],
  ])("maps the auth action %s to %s", (action, actionKey) => {
    expect(mapAuditLogToActivityItem({ ...auditRow, action })).toStrictEqual({ actionKey, createdAt: auditRow.createdAt, params: {} })
  })

  it("drops an action the customer timeline does not show", () => {
    expect(mapAuditLogToActivityItem({ ...auditRow, action: AUDIT_LOG_ACTION.PRODUCT_CREATED })).toBeUndefined()
  })

  it("names the cart item from the metadata the recorder writes", () => {
    expect(
      mapAuditLogToActivityItem({
        ...auditRow,
        action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
        metadata: JSON.stringify({ productTitle: "Silver ring", quantity: 2 }),
      }),
    ).toMatchObject({ actionKey: "cartItemAdded", params: { item: "Silver ring" } })
  })

  it("falls back to the detail column for a row written without metadata", () => {
    expect(
      mapAuditLogToActivityItem({ ...auditRow, action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED, detail: "Gold ring" }),
    ).toMatchObject({ params: { item: "Gold ring" } })
  })

  it("drops a cart event that names no product", () => {
    expect(mapAuditLogToActivityItem({ ...auditRow, action: AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED })).toBeUndefined()
  })

  it.each([
    [AUDIT_LOG_ACTION.ORDER_PLACED, "orderPlaced"],
    [AUDIT_LOG_ACTION.ORDER_SHIPPED, "orderShipped"],
    [AUDIT_LOG_ACTION.ORDER_DELIVERED, "orderDelivered"],
    [AUDIT_LOG_ACTION.ORDER_RELEASED, "orderDelivered"],
  ])("maps the order action %s to %s with the order number", (action, actionKey) => {
    expect(
      mapAuditLogToActivityItem({ ...auditRow, action, metadata: JSON.stringify({ orderId: ORDER_ID }) }, ORDER_NUMBERS),
    ).toMatchObject({
      actionKey,
      params: { id: "MRT-2026-00001" },
    })
  })

  it("drops an order event whose order is not among the customer's own", () => {
    expect(
      mapAuditLogToActivityItem(
        { ...auditRow, action: AUDIT_LOG_ACTION.ORDER_PLACED, metadata: JSON.stringify({ orderId: "someone-else" }) },
        ORDER_NUMBERS,
      ),
    ).toBeUndefined()
  })

  it.each([AUDIT_LOG_ACTION.ORDER_PLACED, AUDIT_LOG_ACTION.ORDER_SHIPPED, AUDIT_LOG_ACTION.ORDER_RELEASED])(
    "drops the order event %s when it identifies no order",
    (action) => {
      expect(mapAuditLogToActivityItem({ ...auditRow, action })).toBeUndefined()
    },
  )

  it("does not invent an order id from an empty metadata field", () => {
    expect(
      mapAuditLogToActivityItem({ ...auditRow, action: AUDIT_LOG_ACTION.ORDER_SHIPPED, metadata: JSON.stringify({ orderId: "" }) }),
    ).toBeUndefined()
  })

  it.each([["{not json"], ['["silver"]']])("drops an order event with unusable metadata %j", (metadata) => {
    expect(mapAuditLogToActivityItem({ ...auditRow, action: AUDIT_LOG_ACTION.ORDER_PLACED, metadata }, ORDER_NUMBERS)).toBeUndefined()
  })
})
