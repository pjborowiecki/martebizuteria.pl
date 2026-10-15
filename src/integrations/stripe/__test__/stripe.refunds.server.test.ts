import type Stripe from "stripe"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { autoPagingToArray, refundsList } = vi.hoisted(() => {
  const toArray = vi.fn<(options: { limit: number }) => Promise<Stripe.Refund[]>>()

  return {
    autoPagingToArray: toArray,
    refundsList: vi.fn<(params: object) => { autoPagingToArray: typeof toArray }>(() => ({ autoPagingToArray: toArray })),
  }
})

vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { refunds: { list: refundsList } } }))

import { isUndoneRefund, listRefunds, readStandingRefunds } from "~/src/integrations/stripe/stripe.refunds.server"

import { refund } from "./fixtures/stripe-webhook-events"

beforeEach(() => {
  vi.clearAllMocks()
  autoPagingToArray.mockResolvedValue([])
})

describe("isUndoneRefund", () => {
  it.each([["failed"], ["canceled"]])("counts a %s refund as one that never reached the customer", (status) => {
    expect(isUndoneRefund({ status })).toBe(true)
  })

  it.each([["succeeded"], ["pending"], ["requires_action"], [null]])("counts a %s refund as one that still stands", (status) => {
    expect(isUndoneRefund({ status })).toBe(false)
  })
})

describe("listRefunds", () => {
  it("reads every page of the refunds Stripe holds for the charge or PaymentIntent", async () => {
    const refunds = [refund({ amount: 1000, status: "succeeded" })]
    autoPagingToArray.mockResolvedValue(refunds)

    await expect(listRefunds({ payment_intent: "pi_test_1" })).resolves.toBe(refunds)
    expect(refundsList).toHaveBeenCalledExactlyOnceWith({ limit: 100, payment_intent: "pi_test_1" })
    expect(autoPagingToArray).toHaveBeenCalledExactlyOnceWith({ limit: 1000 })
  })
})

describe("readStandingRefunds", () => {
  it("adds up the refunds that still stand on the charge and names the newest of them", async () => {
    autoPagingToArray.mockResolvedValue([
      refund({ amount: 4000, id: "re_failed", status: "failed" }),
      refund({ amount: 3000, id: "re_pending", status: "pending" }),
      refund({ amount: 500, id: "re_cancelled", status: "canceled" }),
      refund({ amount: 2000, id: "re_succeeded", status: "succeeded" }),
    ])

    await expect(readStandingRefunds("ch_test_1")).resolves.toStrictEqual({ latestId: "re_pending", total: 5000 })
    expect(refundsList).toHaveBeenCalledExactlyOnceWith({ charge: "ch_test_1", limit: 100 })
  })

  it("reports nothing standing when every refund failed or was cancelled", async () => {
    autoPagingToArray.mockResolvedValue([refund({ amount: 4000, status: "failed" })])

    await expect(readStandingRefunds("ch_test_1")).resolves.toStrictEqual({ latestId: undefined, total: 0 })
  })
})
