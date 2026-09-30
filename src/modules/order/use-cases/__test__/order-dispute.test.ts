import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { clearOrderDispute } from "../clear-order-dispute"
import { flagOrderDispute } from "../flag-order-dispute"

const accessors = vi.hoisted(() => {
  const writes: { metadata: string; orderId: string }[] = []

  return {
    getOrderMetadata: vi.fn((): Promise<{ metadata: string | null } | undefined> => Promise.resolve(undefined)),
    updateOrderMetadata: vi.fn((orderId: string, metadata: string): Promise<void> => {
      writes.push({ metadata, orderId })

      return Promise.resolve(undefined)
    }),
    writes,
  }
})

const settled = vi.hoisted(() => ({
  current: undefined as { checkoutId: string; orderId: string | undefined; paymentId: string; paymentStatus: string } | undefined,
}))

vi.mock("~/src/modules/order/order.accessors", () => ({
  getOrderMetadata: accessors.getOrderMetadata,
  updateOrderMetadata: accessors.updateOrderMetadata,
}))
vi.mock("~/src/modules/order/order.settled.server", () => ({
  findSettledOrder: () => Promise.resolve(settled.current),
}))

const DISPUTE = { amount: 1999, id: "dp_1", reason: "fraudulent", status: "needs_response" }

const onlyWrite = (): { metadata: string; orderId: string } => {
  const [write] = accessors.writes

  if (write === undefined) {
    throw new Error("No metadata was written")
  }

  return write
}

const writtenMetadata = (): unknown => JSON.parse(onlyWrite().metadata)

beforeEach(() => {
  vi.clearAllMocks()
  accessors.writes.length = 0
  settled.current = { checkoutId: "checkout-1", orderId: "order-1", paymentId: "payment-1", paymentStatus: "succeeded" }
  accessors.getOrderMetadata.mockResolvedValue(undefined)
})

describe("flagOrderDispute", () => {
  it("stores the dispute against the order", async () => {
    await flagOrderDispute("pi_123", DISPUTE)

    expect(onlyWrite().orderId).toBe("order-1")
    expect(writtenMetadata()).toStrictEqual({ dispute: DISPUTE })
  })

  it("keeps the metadata the order already carried", async () => {
    accessors.getOrderMetadata.mockResolvedValue({ metadata: '{"source":"web","dispute":{"id":"dp_old"}}' })

    await flagOrderDispute("pi_123", DISPUTE)

    expect(writtenMetadata()).toStrictEqual({ dispute: DISPUTE, source: "web" })
  })

  it("does nothing when the payment has no order yet", async () => {
    settled.current = { checkoutId: "checkout-1", orderId: undefined, paymentId: "payment-1", paymentStatus: "succeeded" }

    await flagOrderDispute("pi_123", DISPUTE)

    expect(accessors.getOrderMetadata).not.toHaveBeenCalled()
    expect(accessors.updateOrderMetadata).not.toHaveBeenCalled()
  })

  it("does nothing for an unknown transaction", async () => {
    settled.current = undefined

    await flagOrderDispute("pi_123", DISPUTE)

    expect(accessors.updateOrderMetadata).not.toHaveBeenCalled()
  })
})

describe("clearOrderDispute", () => {
  it("removes only the dispute from the metadata", async () => {
    accessors.getOrderMetadata.mockResolvedValue({ metadata: '{"source":"web","dispute":{"id":"dp_1"}}' })

    await clearOrderDispute("pi_123")

    expect(writtenMetadata()).toStrictEqual({ source: "web" })
  })

  it("writes empty metadata when the order carried none", async () => {
    await clearOrderDispute("pi_123")

    expect(writtenMetadata()).toStrictEqual({})
  })

  it("does nothing when the payment has no order yet", async () => {
    settled.current = { checkoutId: "checkout-1", orderId: undefined, paymentId: "payment-1", paymentStatus: "succeeded" }

    await clearOrderDispute("pi_123")

    expect(accessors.updateOrderMetadata).not.toHaveBeenCalled()
  })
})
