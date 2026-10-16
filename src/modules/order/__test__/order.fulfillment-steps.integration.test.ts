import { afterAll, beforeAll, describe, expect, it, vi } from "vite-plus/test"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { getAdminOrdersPage } from "~/src/modules/order/order.accessors"
import { ADMIN_ORDER_FULFILLMENT_UI_KEY, ADMIN_ORDER_TAB, type AdminOrderFulfillmentUiKey } from "~/src/modules/order/order.constants"
import { toAdminOrderListItem } from "~/src/modules/order/order.display.utils"

const { sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return { sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }) }
})

vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})

const page = { limit: 25, offset: 0, timeZone: "Europe/Warsaw" }

const ORDERS = [
  ["awaiting-payment", "pending", "not_fulfilled"],
  ["paid", "processing", "not_fulfilled"],
  ["partly-packed", "processing", "partially_fulfilled"],
  ["in-progress", "processing", "fulfilled"],
  ["shipped", "processing", "shipped"],
  ["delivered", "completed", "delivered"],
  ["cancelled", "cancelled", "cancelled"],
  ["fulfilment-cancelled", "processing", "cancelled"],
  ["refunded-in-progress", "refunded", "fulfilled"],
] as const

const listedIds = async (params: Omit<Parameters<typeof getAdminOrdersPage>[0], "limit" | "offset" | "timeZone">): Promise<string[]> => {
  const { rows } = await getAdminOrdersPage({ ...page, ...params })

  return rows.map((row) => row.id).toSorted()
}

const shownSteps = async (): Promise<ReadonlyMap<string, AdminOrderFulfillmentUiKey>> => {
  const { rows } = await getAdminOrdersPage(page)

  return new Map(rows.map((row) => [row.id, toAdminOrderListItem(row).fulfillmentUiKey]))
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
  const insert = sqlite.prepare(`insert into "order" (id, email, order_number, status, fulfillment_status) values (?, ?, ?, ?, ?)`)
  for (const [index, [id, status, fulfillmentStatus]] of ORDERS.entries()) {
    insert.run(id, `${id}@marte.test`, `MRT-2026-${String(index + 1).padStart(5, "0")}`, status, fulfillmentStatus)
  }
})

afterAll(() => {
  sqlite.close()
})

describe("the fulfilment step of an order", () => {
  it.each([
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.PENDING, ["awaiting-payment"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.CONFIRMED, ["paid", "partly-packed"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.PROCESSING, ["in-progress", "refunded-in-progress"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.SHIPPED, ["shipped"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.DELIVERED, ["delivered"]],
    [ADMIN_ORDER_FULFILLMENT_UI_KEY.CANCELLED, ["cancelled", "fulfilment-cancelled"]],
  ])("lists the %s orders under that step", async (fulfillment, expected) => {
    await expect(listedIds({ filters: { fulfillment } })).resolves.toStrictEqual(expected)
  })

  it("shows every listed order with the step its filter finds it under", async () => {
    const steps = await shownSteps()
    const misfiled = await Promise.all(
      [...steps].map(async ([id, fulfillment]) => {
        const listed = await listedIds({ filters: { fulfillment } })

        return listed.includes(id) ? [] : [id]
      }),
    )

    expect(steps.size).toBe(ORDERS.length)
    expect(misfiled.flat()).toStrictEqual([])
  })

  it("keeps an order whose fulfilment started apart from one that is only paid", async () => {
    const steps = await shownSteps()

    expect(steps.get("paid")).toBe(ADMIN_ORDER_FULFILLMENT_UI_KEY.CONFIRMED)
    expect(steps.get("in-progress")).toBe(ADMIN_ORDER_FULFILLMENT_UI_KEY.PROCESSING)
  })

  it("keeps the confirmed and in-progress orders on the unfulfilled tab", async () => {
    await expect(listedIds({ tab: ADMIN_ORDER_TAB.UNFULFILLED })).resolves.toStrictEqual([
      "in-progress",
      "paid",
      "partly-packed",
      "refunded-in-progress",
    ])
  })
})
