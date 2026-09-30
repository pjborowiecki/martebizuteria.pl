import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { cancelOrder, cancelOrderMutation } from "../cancel-order"
import { fulfillOrder, fulfillOrderMutation } from "../fulfill-order"
import { shipOrder, shipOrderMutation } from "../ship-order"

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const database = vi.hoisted(() => {
  const updates: Record<string, unknown>[] = []

  return {
    updateSet: vi.fn((values: Record<string, unknown>) => {
      updates.push(values)

      return { where: () => Promise.resolve(undefined) }
    }),
    updates,
  }
})

interface ActionRow {
  readonly fulfillmentStatus: Order["select"]["fulfillmentStatus"]
  readonly status: Order["select"]["status"]
}

const orderRow = vi.hoisted(() => ({ current: undefined as ActionRow | undefined }))

const audit = vi.hoisted(() => ({
  cancelled: vi.fn(),
  fulfillmentStarted: vi.fn(),
  shipped: vi.fn(),
}))

const background = vi.hoisted(() => ({ notifyOrderShipped: vi.fn(() => Promise.resolve(undefined)), scheduled: vi.fn() }))

const cancellation = vi.hoisted(() => ({
  catalogInvalidated: vi.fn(),
  restockLines: { current: [] as { quantity: number; variantId: string | null }[] },
  runBatch: vi.fn(() => Promise.resolve(undefined)),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { update: () => ({ set: database.updateSet }) },
}))
vi.mock("~/src/integrations/resend/order-shipped.notification.server", () => ({
  notifyOrderShipped: background.notifyOrderShipped,
}))
vi.mock("~/src/lib/background", () => ({ scheduleBackgroundWork: background.scheduled }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.batch", () => ({ runDrizzleBatch: cancellation.runBatch }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductCatalogInvalidation: cancellation.catalogInvalidated,
}))
vi.mock("~/src/modules/order/order.accessors", () => ({
  getRestockLinesForOrder: () => Promise.resolve(cancellation.restockLines.current),
}))
vi.mock("~/src/modules/order/order.utils", () => ({
  prepareCancelOrderBatch: (orderId: string, lines: readonly { quantity: number; variantId: string }[]) => {
    database.updates.push({ canceledAt: new Date(), fulfillmentStatus: "cancelled", orderId, restocked: lines, status: "cancelled" })

    return ["cancel-stmt"]
  },
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordOrderCancelledAudit: audit.cancelled,
  recordOrderFulfillmentStartedAudit: audit.fulfillmentStarted,
  recordOrderShippedAudit: audit.shipped,
}))
vi.mock(import("~/src/modules/order/order.admin-action.server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getAdminOrderActionRow: () => Promise.resolve(orderRow.current) }
})
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
        handler({ data: builder.validate(options.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate

        return builder
      },
    }

    return builder
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  database.updates.length = 0
  cancellation.restockLines.current = [{ quantity: 2, variantId: "v-1" }]
  orderRow.current = { fulfillmentStatus: "not_fulfilled", status: "pending" }
})

describe("cancelOrder", () => {
  it("cancels a pending order and stamps the cancellation time", async () => {
    await expect(cancelOrder({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })
    expect(database.updates[0]).toMatchObject({ fulfillmentStatus: "cancelled", status: "cancelled" })
    expect(database.updates[0]?.["canceledAt"]).toBeInstanceOf(Date)
  })

  it("records the cancellation in the audit log", async () => {
    await cancelOrder({ data: { orderId: ORDER_ID } })

    expect(audit.cancelled).toHaveBeenCalledWith(ORDER_ID)
  })

  it("returns the cancelled lines to stock, as a refund would", async () => {
    await cancelOrder({ data: { orderId: ORDER_ID } })

    expect(database.updates[0]?.["restocked"]).toStrictEqual([{ quantity: 2, variantId: "v-1" }])
    expect(cancellation.runBatch).toHaveBeenCalledWith(["cancel-stmt"])
    expect(cancellation.catalogInvalidated).toHaveBeenCalledOnce()
  })

  it("skips lines whose variant has since been deleted", async () => {
    cancellation.restockLines.current = [{ quantity: 2, variantId: null }]
    await cancelOrder({ data: { orderId: ORDER_ID } })

    expect(database.updates[0]?.["restocked"]).toStrictEqual([])
  })

  it("refuses to cancel an order that is already cancelled", async () => {
    orderRow.current = { fulfillmentStatus: "cancelled", status: "cancelled" }

    await expect(cancelOrder({ data: { orderId: ORDER_ID } })).rejects.toThrow(
      new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE),
    )
    expect(database.updates).toHaveLength(0)
  })

  it("reports a missing order as not found", async () => {
    orderRow.current = undefined

    await expect(cancelOrder({ data: { orderId: ORDER_ID } })).rejects.toThrow(
      new AppError(ERROR_CODES.NOT_FOUND, ORDER_ERROR_CODES.NOT_FOUND),
    )
  })

  it("rejects an order id that is not a uuid before touching the database", () => {
    expect(() => {
      void cancelOrder({ data: { orderId: "order-1" } })
    }).toThrow("Invalid UUID")
    expect(database.updates).toHaveLength(0)
  })

  it("keys its mutation by the shared cancel key", () => {
    expect(cancelOrderMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.CANCEL)
  })
})

describe("fulfillOrder", () => {
  it("promotes a pending order to processing as it is fulfilled", async () => {
    await fulfillOrder({ data: { orderId: ORDER_ID } })

    expect(database.updates[0]).toMatchObject({ fulfillmentStatus: "fulfilled", status: "processing" })
  })

  it("keeps a status that is already past pending", async () => {
    orderRow.current = { fulfillmentStatus: "not_fulfilled", status: "processing" }

    await fulfillOrder({ data: { orderId: ORDER_ID } })

    expect(database.updates[0]).toMatchObject({ status: "processing" })
  })

  it("refuses to fulfill an order that is already shipped", async () => {
    orderRow.current = { fulfillmentStatus: "shipped", status: "processing" }

    await expect(fulfillOrder({ data: { orderId: ORDER_ID } })).rejects.toThrow(AppError)
  })

  it("records the start of fulfillment in the audit log", async () => {
    await fulfillOrder({ data: { orderId: ORDER_ID } })

    expect(audit.fulfillmentStarted).toHaveBeenCalledWith(ORDER_ID)
  })

  it("keys its mutation by the shared fulfill key", () => {
    expect(fulfillOrderMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.FULFILL)
  })

  it("fulfills the order the mutation was handed", async () => {
    await expect(new MutationObserver(new QueryClient(), fulfillOrderMutation).mutate({ orderId: ORDER_ID })).resolves.toStrictEqual({
      ok: true,
      orderId: ORDER_ID,
    })
  })
})

describe("shipOrder", () => {
  beforeEach(() => {
    orderRow.current = { fulfillmentStatus: "fulfilled", status: "processing" }
  })

  it("marks a fulfilled order shipped and stamps the shipping time", async () => {
    await expect(shipOrder({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })
    expect(database.updates[0]).toMatchObject({ fulfillmentStatus: "shipped" })
    expect(database.updates[0]?.["shippedAt"]).toBeInstanceOf(Date)
  })

  it("sends the shipping notification in the background", async () => {
    await shipOrder({ data: { orderId: ORDER_ID } })

    expect(background.notifyOrderShipped).toHaveBeenCalledWith(ORDER_ID)
    expect(background.scheduled).toHaveBeenCalledTimes(1)
  })

  it("refuses to ship an order that was never fulfilled", async () => {
    orderRow.current = { fulfillmentStatus: "not_fulfilled", status: "pending" }

    await expect(shipOrder({ data: { orderId: ORDER_ID } })).rejects.toThrow(AppError)
    expect(background.notifyOrderShipped).not.toHaveBeenCalled()
  })

  it("keys its mutation by the shared ship key", () => {
    expect(shipOrderMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.SHIP)
  })
})

it("cancels an order through its mutation", async () => {
  await expect(new MutationObserver(new QueryClient(), cancelOrderMutation).mutate({ orderId: ORDER_ID })).resolves.toStrictEqual({
    ok: true,
    orderId: ORDER_ID,
  })
  expect(database.updates[0]).toMatchObject({ status: "cancelled" })
})
it("ships a fulfilled order through its mutation and schedules the notification", async () => {
  orderRow.current = { fulfillmentStatus: "fulfilled", status: "processing" }
  await expect(new MutationObserver(new QueryClient(), shipOrderMutation).mutate({ orderId: ORDER_ID })).resolves.toStrictEqual({
    ok: true,
    orderId: ORDER_ID,
  })
  expect(background.notifyOrderShipped).toHaveBeenCalledWith(ORDER_ID)
})
