import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { executionContextStorage } from "~/src/lib/background"

import { cancelOrder, cancelOrderMutation } from "../cancel-order"
import { fulfillOrder, fulfillOrderMutation } from "../fulfill-order"
import { markOrderDelivered, markOrderDeliveredMutation } from "../mark-order-delivered"
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
  released: vi.fn(),
  shipped: vi.fn(),
}))

const shippedEmail = vi.hoisted(() => ({ notifyOrderShipped: vi.fn<(orderId: string, origin: string) => Promise<boolean>>() }))

const incoming = vi.hoisted(() => ({ getRequest: vi.fn<() => Request>() }))

const cancellation = vi.hoisted(() => ({
  catalogInvalidated: vi.fn(),
  restockLines: { current: [] as { quantity: number; variantId: string | null }[] },
  runBatch: vi.fn(() => Promise.resolve(undefined)),
}))

vi.mock("@tanstack/react-start/server", () => ({ getRequest: incoming.getRequest }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { update: () => ({ set: database.updateSet }) },
}))
vi.mock("~/src/integrations/resend/order-shipped.notification.server", () => ({
  notifyOrderShipped: shippedEmail.notifyOrderShipped,
}))
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
  recordOrderReleasedAudit: audit.released,
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

const dialect = new SQLiteSyncDialect()

const renderedSql = (value: unknown): string => {
  if (!(value instanceof SQL)) {
    throw new TypeError("Expected a SQL expression")
  }

  return dialect.sqlToQuery(value).sql
}

beforeEach(() => {
  vi.clearAllMocks()
  incoming.getRequest.mockReturnValue(
    new Request("http://127.0.0.1:3000/_serverFn/ship-order", { headers: { origin: "https://attacker.example" } }),
  )
  shippedEmail.notifyOrderShipped.mockResolvedValue(true)
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
    await expect(shipOrder({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID, shippedEmailSent: true })
    expect(database.updates[0]).toMatchObject({ fulfillmentStatus: "shipped" })
    expect(database.updates[0]?.["shippedAt"]).toBeInstanceOf(Date)
  })

  it("answers with the shipping email result and keeps the send running for the Worker if the admin disconnects", async () => {
    const delivery = Promise.withResolvers<boolean>()
    shippedEmail.notifyOrderShipped.mockReturnValue(delivery.promise)
    const kept: Promise<unknown>[] = []

    const shipping = executionContextStorage.run(
      {
        waitUntil: (task) => {
          kept.push(task)
        },
      },
      () => shipOrder({ data: { orderId: ORDER_ID } }),
    )
    await vi.waitFor(() => {
      expect(kept).toHaveLength(1)
    })
    delivery.resolve(false)

    await expect(shipping).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID, shippedEmailSent: false })
    await Promise.all(kept)
    expect(shippedEmail.notifyOrderShipped).toHaveBeenCalledExactlyOnceWith(ORDER_ID, "http://127.0.0.1:3000")
  })

  it("refuses a request on a host this build does not serve before the order is touched", async () => {
    incoming.getRequest.mockReturnValue(new Request("https://martebizuteria.pl.attacker.example/_serverFn/ship-order"))

    await expect(shipOrder({ data: { orderId: ORDER_ID } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(database.updates).toHaveLength(0)
    expect(shippedEmail.notifyOrderShipped).not.toHaveBeenCalled()
  })

  it("keeps the order shipped and tells the admin when the shipping email failed", async () => {
    shippedEmail.notifyOrderShipped.mockResolvedValue(false)

    await expect(shipOrder({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({
      ok: true,
      orderId: ORDER_ID,
      shippedEmailSent: false,
    })
    expect(database.updates[0]).toMatchObject({ fulfillmentStatus: "shipped" })
    expect(audit.shipped).toHaveBeenCalledOnce()
  })

  it("refuses to ship an order that was never fulfilled", async () => {
    orderRow.current = { fulfillmentStatus: "not_fulfilled", status: "pending" }

    await expect(shipOrder({ data: { orderId: ORDER_ID } })).rejects.toThrow(AppError)
    expect(shippedEmail.notifyOrderShipped).not.toHaveBeenCalled()
  })

  it("keys its mutation by the shared ship key", () => {
    expect(shipOrderMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.SHIP)
  })

  it("stores the trimmed tracking number and url and records the number in the audit log", async () => {
    await shipOrder({ data: { orderId: ORDER_ID, trackingNumber: "  TRK-9  ", trackingUrl: "https://tracking.test/TRK-9" } })

    expect(database.updates[0]).toMatchObject({ trackingNumber: "TRK-9", trackingUrl: "https://tracking.test/TRK-9" })
    expect(audit.shipped).toHaveBeenCalledWith(ORDER_ID, { detail: "TRK-9" })
  })

  it("clears any stored tracking details when the parcel ships without them", async () => {
    await shipOrder({ data: { orderId: ORDER_ID } })

    expect(renderedSql(database.updates[0]?.["trackingNumber"])).toBe("null")
    expect(renderedSql(database.updates[0]?.["trackingUrl"])).toBe("null")
    expect(audit.shipped).toHaveBeenCalledWith(ORDER_ID, { detail: undefined })
  })

  it("treats a blank tracking number and url as no tracking at all", async () => {
    await shipOrder({ data: { orderId: ORDER_ID, trackingNumber: "   ", trackingUrl: "" } })

    expect(renderedSql(database.updates[0]?.["trackingNumber"])).toBe("null")
    expect(renderedSql(database.updates[0]?.["trackingUrl"])).toBe("null")
    expect(audit.shipped).toHaveBeenCalledWith(ORDER_ID, { detail: undefined })
  })
})

describe("markOrderDelivered", () => {
  beforeEach(() => {
    orderRow.current = { fulfillmentStatus: "shipped", status: "processing" }
  })

  it("marks a shipped order delivered, completes it and stamps the delivery time", async () => {
    await expect(markOrderDelivered({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({ ok: true, orderId: ORDER_ID })
    expect(database.updates[0]).toMatchObject({ fulfillmentStatus: "delivered", status: "completed" })
    expect(database.updates[0]?.["deliveredAt"]).toBeInstanceOf(Date)
  })

  it("records the release of the order in the audit log", async () => {
    await markOrderDelivered({ data: { orderId: ORDER_ID } })

    expect(audit.released).toHaveBeenCalledWith(ORDER_ID)
  })

  it("refuses to mark delivered an order that has not shipped", async () => {
    orderRow.current = { fulfillmentStatus: "fulfilled", status: "processing" }

    await expect(markOrderDelivered({ data: { orderId: ORDER_ID } })).rejects.toThrow(
      new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE),
    )
    expect(database.updates).toHaveLength(0)
    expect(audit.released).not.toHaveBeenCalled()
  })

  it("refuses to mark delivered a refunded order", async () => {
    orderRow.current = { fulfillmentStatus: "shipped", status: "refunded" }

    await expect(markOrderDelivered({ data: { orderId: ORDER_ID } })).rejects.toThrow(AppError)
    expect(database.updates).toHaveLength(0)
  })

  it("reports a missing order as not found", async () => {
    orderRow.current = undefined

    await expect(markOrderDelivered({ data: { orderId: ORDER_ID } })).rejects.toThrow(
      new AppError(ERROR_CODES.NOT_FOUND, ORDER_ERROR_CODES.NOT_FOUND),
    )
  })

  it("rejects an order id that is not a uuid before touching the database", () => {
    expect(() => {
      void markOrderDelivered({ data: { orderId: "order-1" } })
    }).toThrow("Invalid UUID")
    expect(database.updates).toHaveLength(0)
  })

  it("keys its mutation by the shared mark delivered key", () => {
    expect(markOrderDeliveredMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.MARK_DELIVERED)
  })

  it("marks the order the mutation was handed delivered", async () => {
    await expect(new MutationObserver(new QueryClient(), markOrderDeliveredMutation).mutate({ orderId: ORDER_ID })).resolves.toStrictEqual({
      ok: true,
      orderId: ORDER_ID,
    })
    expect(database.updates[0]).toMatchObject({ status: "completed" })
  })
})

it("cancels an order through its mutation", async () => {
  await expect(new MutationObserver(new QueryClient(), cancelOrderMutation).mutate({ orderId: ORDER_ID })).resolves.toStrictEqual({
    ok: true,
    orderId: ORDER_ID,
  })
  expect(database.updates[0]).toMatchObject({ status: "cancelled" })
})
it("ships a fulfilled order through its mutation and sends the notification", async () => {
  orderRow.current = { fulfillmentStatus: "fulfilled", status: "processing" }
  await expect(new MutationObserver(new QueryClient(), shipOrderMutation).mutate({ orderId: ORDER_ID })).resolves.toStrictEqual({
    ok: true,
    orderId: ORDER_ID,
    shippedEmailSent: true,
  })
  expect(shippedEmail.notifyOrderShipped).toHaveBeenCalledWith(ORDER_ID, "http://127.0.0.1:3000")
})
