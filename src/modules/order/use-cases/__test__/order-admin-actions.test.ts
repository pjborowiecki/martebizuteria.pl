import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { SQL } from "drizzle-orm"
import { SQLiteSyncDialect } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ORDER_ERROR_CODES, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { type Order } from "~/src/modules/order/order.types"

import { fulfillOrder, fulfillOrderMutation } from "../fulfill-order"
import { markOrderDelivered, markOrderDeliveredMutation } from "../mark-order-delivered"
import { shipOrder, shipOrderMutation } from "../ship-order"

const ORDER_ID = "0192f3a4-5b6c-7d8e-9fab-cdef01234567"

const SHIPPED_EMAIL_SENT = { kind: "order-shipped", status: "sent" }

const IN_PROGRESS_EMAIL_SENT = { kind: "order-in-progress", status: "sent" }

const DELIVERED_EMAIL_SENT = { kind: "order-delivered", status: "sent" }

const database = vi.hoisted(() => {
  const updates: Record<string, unknown>[] = []
  const unmatched: number[] = []

  return {
    unmatched,
    updateSet: vi.fn((values: Record<string, unknown>) => {
      updates.push(values)
      const matched = !unmatched.includes(updates.length)

      return { where: () => ({ returning: () => Promise.resolve(matched ? [{ id: "0192f3a4-5b6c-7d8e-9fab-cdef01234567" }] : []) }) }
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
  delivered: vi.fn(),
  fulfillmentStarted: vi.fn(),
  shipped: vi.fn(),
}))

const announcement = vi.hoisted(() => ({
  announceOrderShipment: vi.fn<(orderId: string, origin: string) => Promise<{ readonly kind: string; readonly status: string }>>(),
}))

const progressEmails = vi.hoisted(() => ({
  sendOrderDeliveredEmail: vi.fn<(orderId: string, origin: string) => Promise<boolean>>(),
  sendOrderInProgressEmail: vi.fn<(orderId: string, origin: string) => Promise<boolean>>(),
}))

const incoming = vi.hoisted(() => ({ getRequest: vi.fn<() => Request>() }))

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: incoming.getRequest }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({
  db: { update: () => ({ set: database.updateSet }) },
}))
vi.mock("~/src/modules/order/use-cases/announce-order-shipment.server", () => announcement)
vi.mock("~/src/modules/order/use-cases/send-order-in-progress-email.server", () => progressEmails)
vi.mock("~/src/modules/order/use-cases/send-order-delivered-email.server", () => progressEmails)
vi.mock("~/src/modules/audit-log/use-cases/record-email-audit.server", () => ({}))
vi.mock("~/src/modules/audit-log/use-cases/record-order-audit.server", () => ({
  recordOrderDeliveredAudit: audit.delivered,
  recordOrderFulfillmentStartedAudit: audit.fulfillmentStarted,
  recordOrderShippedAudit: audit.shipped,
}))
vi.mock(import("~/src/modules/order/use-cases/transition-order.server"), async (importOriginal) => {
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
  announcement.announceOrderShipment.mockResolvedValue(SHIPPED_EMAIL_SENT)
  progressEmails.sendOrderInProgressEmail.mockResolvedValue(true)
  progressEmails.sendOrderDeliveredEmail.mockResolvedValue(true)
  database.updates.length = 0
  database.unmatched.length = 0
  orderRow.current = { fulfillmentStatus: "not_fulfilled", status: "pending" }
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

  it("records the start of fulfillment in the audit log and on the order", async () => {
    await fulfillOrder({ data: { orderId: ORDER_ID } })

    expect(audit.fulfillmentStarted).toHaveBeenCalledWith(ORDER_ID)
    expect(database.updates[0]?.["fulfillmentStartedAt"]).toBeInstanceOf(Date)
  })

  it("tells the customer, on the shop the admin works in, that their order is being prepared", async () => {
    await expect(fulfillOrder({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({
      email: IN_PROGRESS_EMAIL_SENT,
      ok: true,
      orderId: ORDER_ID,
    })
    expect(database.updates[1]?.["inProgressEmailAt"]).toBeInstanceOf(Date)
    expect(progressEmails.sendOrderInProgressEmail).toHaveBeenCalledExactlyOnceWith(ORDER_ID, "http://127.0.0.1:3000")
  })

  it("does not tell the customer again when an order stepped back starts fulfilment a second time", async () => {
    database.unmatched.push(2)

    await expect(fulfillOrder({ data: { orderId: ORDER_ID } })).resolves.toMatchObject({
      email: { kind: "order-in-progress", status: "alreadySent" },
    })
    expect(progressEmails.sendOrderInProgressEmail).not.toHaveBeenCalled()
  })

  it("refuses a second start of fulfilment another click already made, without a second email", async () => {
    orderRow.current = { fulfillmentStatus: "not_fulfilled", status: "processing" }
    database.unmatched.push(1)

    await expect(fulfillOrder({ data: { orderId: ORDER_ID } })).rejects.toThrow(
      new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE),
    )
    expect(audit.fulfillmentStarted).not.toHaveBeenCalled()
    expect(progressEmails.sendOrderInProgressEmail).not.toHaveBeenCalled()
  })

  it("refuses a request on a host this build does not serve before the order is touched", async () => {
    incoming.getRequest.mockReturnValue(new Request("https://martebizuteria.pl.attacker.example/_serverFn/fulfill-order"))

    await expect(fulfillOrder({ data: { orderId: ORDER_ID } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(database.updates).toHaveLength(0)
  })

  it("keys its mutation by the shared fulfill key", () => {
    expect(fulfillOrderMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.FULFILL)
  })

  it("fulfills the order the mutation was handed", async () => {
    await expect(new MutationObserver(new QueryClient(), fulfillOrderMutation).mutate({ orderId: ORDER_ID })).resolves.toStrictEqual({
      email: IN_PROGRESS_EMAIL_SENT,
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
    await expect(shipOrder({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({
      email: SHIPPED_EMAIL_SENT,
      ok: true,
      orderId: ORDER_ID,
    })
    expect(database.updates[0]).toMatchObject({ fulfillmentStatus: "shipped" })
    expect(database.updates[0]?.["shippedAt"]).toBeInstanceOf(Date)
  })

  it("announces the shipment to the customer on the shop the admin works in", async () => {
    await shipOrder({ data: { orderId: ORDER_ID } })

    expect(announcement.announceOrderShipment).toHaveBeenCalledExactlyOnceWith(ORDER_ID, "http://127.0.0.1:3000")
  })

  it("refuses a request on a host this build does not serve before the order is touched", async () => {
    incoming.getRequest.mockReturnValue(new Request("https://martebizuteria.pl.attacker.example/_serverFn/ship-order"))

    await expect(shipOrder({ data: { orderId: ORDER_ID } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(database.updates).toHaveLength(0)
    expect(announcement.announceOrderShipment).not.toHaveBeenCalled()
  })

  it("keeps the order shipped and tells the admin when the shipping email failed", async () => {
    announcement.announceOrderShipment.mockResolvedValue({ kind: "order-shipped", status: "failed" })

    await expect(shipOrder({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({
      email: { kind: "order-shipped", status: "failed" },
      ok: true,
      orderId: ORDER_ID,
    })
    expect(database.updates[0]).toMatchObject({ fulfillmentStatus: "shipped" })
    expect(audit.shipped).toHaveBeenCalledOnce()
  })

  it("refuses to ship an order that was never fulfilled", async () => {
    orderRow.current = { fulfillmentStatus: "not_fulfilled", status: "pending" }

    await expect(shipOrder({ data: { orderId: ORDER_ID } })).rejects.toThrow(AppError)
    expect(announcement.announceOrderShipment).not.toHaveBeenCalled()
  })

  it("refuses a second shipping of an order another click already shipped, without a second email", async () => {
    database.unmatched.push(1)

    await expect(shipOrder({ data: { orderId: ORDER_ID } })).rejects.toThrow(
      new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE),
    )
    expect(audit.shipped).not.toHaveBeenCalled()
    expect(announcement.announceOrderShipment).not.toHaveBeenCalled()
  })

  it("keys its mutation by the shared ship key", () => {
    expect(shipOrderMutation.mutationKey).toStrictEqual(ORDER_MUTATION_KEYS.SHIP)
  })

  it("stores the trimmed tracking number and url and records the number in the audit log", async () => {
    await shipOrder({ data: { orderId: ORDER_ID, trackingNumber: "  TRK-9  ", trackingUrl: "https://tracking.test/TRK-9" } })

    expect(database.updates[0]).toMatchObject({ trackingNumber: "TRK-9", trackingUrl: "https://tracking.test/TRK-9" })
    expect(audit.shipped).toHaveBeenCalledWith(ORDER_ID, { detail: "TRK-9" })
  })

  it("keeps the tracking details an InPost shipment stored when the parcel ships without new ones", async () => {
    await shipOrder({ data: { orderId: ORDER_ID } })

    expect(database.updates[0]).not.toHaveProperty("trackingNumber")
    expect(database.updates[0]).not.toHaveProperty("trackingUrl")
    expect(audit.shipped).toHaveBeenCalledWith(ORDER_ID, { detail: undefined })
  })

  it("treats a blank tracking number and url as none given", async () => {
    await shipOrder({ data: { orderId: ORDER_ID, trackingNumber: "   ", trackingUrl: "" } })

    expect(database.updates[0]).not.toHaveProperty("trackingNumber")
    expect(database.updates[0]).not.toHaveProperty("trackingUrl")
    expect(audit.shipped).toHaveBeenCalledWith(ORDER_ID, { detail: undefined })
  })

  it("drops the stored tracking link when a new tracking number comes without one", async () => {
    await shipOrder({ data: { orderId: ORDER_ID, trackingNumber: "TRK-9" } })

    expect(database.updates[0]).toMatchObject({ trackingNumber: "TRK-9" })
    expect(renderedSql(database.updates[0]?.["trackingUrl"])).toBe("null")
  })

  it("replaces only the tracking link when no new tracking number comes with it", async () => {
    await shipOrder({ data: { orderId: ORDER_ID, trackingUrl: "https://tracking.test/TRK-9" } })

    expect(database.updates[0]).toMatchObject({ trackingUrl: "https://tracking.test/TRK-9" })
    expect(database.updates[0]).not.toHaveProperty("trackingNumber")
  })
})

describe("markOrderDelivered", () => {
  beforeEach(() => {
    orderRow.current = { fulfillmentStatus: "shipped", status: "processing" }
  })

  it("marks a shipped order delivered, completes it and stamps the delivery time", async () => {
    await expect(markOrderDelivered({ data: { orderId: ORDER_ID } })).resolves.toStrictEqual({
      email: DELIVERED_EMAIL_SENT,
      ok: true,
      orderId: ORDER_ID,
    })
    expect(database.updates[0]).toMatchObject({ fulfillmentStatus: "delivered", status: "completed" })
    expect(database.updates[0]?.["deliveredAt"]).toBeInstanceOf(Date)
  })

  it("thanks the customer once, on the shop the admin works in", async () => {
    await markOrderDelivered({ data: { orderId: ORDER_ID } })

    expect(database.updates[1]?.["deliveredEmailAt"]).toBeInstanceOf(Date)
    expect(progressEmails.sendOrderDeliveredEmail).toHaveBeenCalledExactlyOnceWith(ORDER_ID, "http://127.0.0.1:3000")
  })

  it("does not thank the customer again when an order stepped back is delivered once more", async () => {
    database.unmatched.push(2)

    await expect(markOrderDelivered({ data: { orderId: ORDER_ID } })).resolves.toMatchObject({
      email: { kind: "order-delivered", status: "alreadySent" },
    })
    expect(progressEmails.sendOrderDeliveredEmail).not.toHaveBeenCalled()
  })

  it("refuses a delivery another click already recorded, without a second thank-you", async () => {
    database.unmatched.push(1)

    await expect(markOrderDelivered({ data: { orderId: ORDER_ID } })).rejects.toThrow(
      new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE),
    )
    expect(audit.delivered).not.toHaveBeenCalled()
    expect(progressEmails.sendOrderDeliveredEmail).not.toHaveBeenCalled()
  })

  it("records the delivery of the order in the audit log", async () => {
    await markOrderDelivered({ data: { orderId: ORDER_ID } })

    expect(audit.delivered).toHaveBeenCalledWith(ORDER_ID)
  })

  it("refuses to mark delivered an order that has not shipped", async () => {
    orderRow.current = { fulfillmentStatus: "fulfilled", status: "processing" }

    await expect(markOrderDelivered({ data: { orderId: ORDER_ID } })).rejects.toThrow(
      new AppError(ERROR_CODES.CONFLICT, ORDER_ERROR_CODES.INVALID_STATE),
    )
    expect(database.updates).toHaveLength(0)
    expect(audit.delivered).not.toHaveBeenCalled()
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
      email: DELIVERED_EMAIL_SENT,
      ok: true,
      orderId: ORDER_ID,
    })
    expect(database.updates[0]).toMatchObject({ status: "completed" })
  })
})

it("ships a fulfilled order through its mutation and sends the notification", async () => {
  orderRow.current = { fulfillmentStatus: "fulfilled", status: "processing" }
  await expect(new MutationObserver(new QueryClient(), shipOrderMutation).mutate({ orderId: ORDER_ID })).resolves.toStrictEqual({
    email: SHIPPED_EMAIL_SENT,
    ok: true,
    orderId: ORDER_ID,
  })
  expect(announcement.announceOrderShipment).toHaveBeenCalledWith(ORDER_ID, "http://127.0.0.1:3000")
})
