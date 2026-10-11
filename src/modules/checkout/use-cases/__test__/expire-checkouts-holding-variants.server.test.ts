import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { expireCheckoutsHoldingVariants } from "~/src/modules/checkout/use-cases/expire-checkouts-holding-variants.server"

const checkouts = vi.hoisted(() => ({
  expire: vi.fn<(sessionId: string) => Promise<{ id: string; status: string }>>(),
  openSessionIds: vi.fn<(variantIds: readonly string[]) => Promise<string[]>>(),
  release: vi.fn<(session: { id: string; status: string }) => Promise<void>>(),
}))

vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { checkout: { sessions: { expire: checkouts.expire } } } }))
vi.mock("~/src/integrations/stripe/stripe.actions.server", () => ({ releaseExpiredCheckoutSession: checkouts.release }))
vi.mock("~/src/modules/payment/payment.accessors", () => ({ getOpenCheckoutSessionIdsHoldingVariants: checkouts.openSessionIds }))

const VARIANT_IDS = ["variant-ring", "variant-chain"]

beforeEach(() => {
  vi.clearAllMocks()
  checkouts.expire.mockImplementation((sessionId) => Promise.resolve({ id: sessionId, status: "expired" }))
  checkouts.release.mockResolvedValue(undefined)
})

describe("expireCheckoutsHoldingVariants", () => {
  it("looks up the open checkouts holding any of the variants", async () => {
    checkouts.openSessionIds.mockResolvedValue([])

    await expireCheckoutsHoldingVariants(VARIANT_IDS)

    expect(checkouts.openSessionIds).toHaveBeenCalledExactlyOnceWith(VARIANT_IDS)
  })

  it("expires each open session and releases it from the expired session Stripe returns", async () => {
    checkouts.openSessionIds.mockResolvedValue(["cs_ring", "cs_chain"])

    await expect(expireCheckoutsHoldingVariants(VARIANT_IDS)).resolves.toBe(2)

    expect(checkouts.expire.mock.calls).toStrictEqual([["cs_ring"], ["cs_chain"]])
    expect(checkouts.release.mock.calls).toStrictEqual([[{ id: "cs_ring", status: "expired" }], [{ id: "cs_chain", status: "expired" }]])
  })

  it("counts and releases only the sessions Stripe expired, logging the one it refused", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    const refusal = new Error('Only Checkout Sessions with a status in ["open"] can be expired.')
    checkouts.openSessionIds.mockResolvedValue(["cs_paid", "cs_open"])
    checkouts.expire.mockRejectedValueOnce(refusal)

    await expect(expireCheckoutsHoldingVariants(VARIANT_IDS)).resolves.toBe(1)

    expect(checkouts.release).toHaveBeenCalledExactlyOnceWith({ id: "cs_open", status: "expired" })
    expect(log).toHaveBeenCalledExactlyOnceWith("Failed to expire Checkout Session cs_paid holding a product taken off sale:", refusal)
  })

  it("asks Stripe nothing when no open checkout holds the variants", async () => {
    checkouts.openSessionIds.mockResolvedValue([])

    await expect(expireCheckoutsHoldingVariants(VARIANT_IDS)).resolves.toBe(0)

    expect(checkouts.expire).not.toHaveBeenCalled()
  })
})
