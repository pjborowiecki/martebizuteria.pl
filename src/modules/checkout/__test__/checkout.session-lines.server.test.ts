import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { getCheckoutLinesByTransactionId } = vi.hoisted(() => ({
  getCheckoutLinesByTransactionId:
    vi.fn<(transactionId: string) => Promise<{ price: number; qty: number; title: string; variantId: string }[]>>(),
}))

vi.mock("~/src/modules/payment/payment.accessors", () => ({ getCheckoutLinesByTransactionId }))

import { checkoutSession } from "~/src/integrations/stripe/__test__/fixtures/stripe-webhook-events"

import { readCheckoutSessionLines } from "~/src/modules/checkout/checkout.session-lines.server"

const STORED_LINE = { price: 24_900, qty: 1, title: "Ring", variantId: "var-ring" }

const METADATA_LINE = { price: 37_450, qty: 2, title: "Chain", variantId: "var-chain" }

beforeEach(() => {
  getCheckoutLinesByTransactionId.mockReset()
})

describe("readCheckoutSessionLines", () => {
  it("reads the cart the session's payment was opened with", async () => {
    getCheckoutLinesByTransactionId.mockResolvedValue([STORED_LINE])
    const session = checkoutSession({ id: "cs_new", metadata: { checkoutId: "checkout-1" } })

    await expect(readCheckoutSessionLines(session)).resolves.toStrictEqual([STORED_LINE])
    expect(getCheckoutLinesByTransactionId).toHaveBeenCalledExactlyOnceWith("cs_new")
  })

  it("falls back to the lines a session created before the move carried in its metadata", async () => {
    getCheckoutLinesByTransactionId.mockResolvedValue([])
    const session = checkoutSession({ id: "cs_old", metadata: { items: JSON.stringify([METADATA_LINE]) } })

    await expect(readCheckoutSessionLines(session)).resolves.toStrictEqual([METADATA_LINE])
  })
})
