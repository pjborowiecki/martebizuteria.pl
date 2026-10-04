import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { removeDuplicateSavedCards, removeDuplicateSavedCardsMutation } from "../remove-duplicate-saved-cards"

interface StoredCard {
  readonly card?: { readonly fingerprint?: string | null }
  readonly customer?: unknown
  readonly id: string
}

const calls = vi.hoisted(() => ({
  detach: vi.fn<(id: string) => Promise<unknown>>(),
  getCustomerId: vi.fn<(userId: string) => Promise<string | undefined>>(),
  list: vi.fn<(params: object) => Promise<{ data: StoredCard[] }>>(),
  retrieve: vi.fn<(id: string) => Promise<StoredCard>>(),
  withRateLimit: vi.fn<(kind: string, limit: object) => object>(() => ({})),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  authorized: () => ({}),
  withRateLimit: calls.withRateLimit,
}))
vi.mock("~/src/integrations/stripe/stripe.customer.server", () => ({ getStripeCustomerId: calls.getCustomerId }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { paymentMethods: { detach: calls.detach, list: calls.list, retrieve: calls.retrieve } },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options: { data: unknown }) =>
        handler({ context: { auth: { user: { id: "user-1" } } }, data: options.data }),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => ({
        handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options: { data: unknown }) =>
          Promise.resolve(options.data).then((data) => handler({ context: { auth: { user: { id: "user-1" } } }, data: validate(data) })),
      }),
    }

    return builder
  },
}))

const rateLimitsAppliedOnLoad = [...calls.withRateLimit.mock.calls]

const card = (id: string, fingerprint: string | null, customer: unknown = "cus_1"): StoredCard => ({ card: { fingerprint }, customer, id })

const NEW_VISA = card("pm_new", "fp_visa")

const keep = (paymentMethodId: string) => removeDuplicateSavedCards({ data: { paymentMethodId } })

beforeEach(() => {
  vi.clearAllMocks()
  calls.getCustomerId.mockResolvedValue("cus_1")
  calls.retrieve.mockResolvedValue(NEW_VISA)
  calls.list.mockResolvedValue({ data: [NEW_VISA, card("pm_mastercard", "fp_mastercard"), card("pm_old_visa", "fp_visa")] })
  calls.detach.mockResolvedValue({})
})

describe("removeDuplicateSavedCards", () => {
  it("is rate limited like the other card endpoints", () => {
    expect(rateLimitsAppliedOnLoad).toStrictEqual([["remove-duplicate-saved-cards", { max: 3, window: 60 }]])
  })

  it("detaches the older copies of the card the shopper just saved and keeps the new one", async () => {
    await expect(keep("pm_new")).resolves.toStrictEqual({ removed: 1 })
    expect(calls.list).toHaveBeenCalledWith({ customer: "cus_1", limit: 100, type: "card" })
    expect(calls.detach.mock.calls).toStrictEqual([["pm_old_visa"]])
  })

  it("leaves the wallet alone when the card was not saved before", async () => {
    calls.list.mockResolvedValue({ data: [NEW_VISA, card("pm_mastercard", "fp_mastercard")] })

    await expect(keep("pm_new")).resolves.toStrictEqual({ removed: 0 })
    expect(calls.detach).not.toHaveBeenCalled()
  })

  it.each([
    ["no fingerprint", { customer: "cus_1", id: "pm_new" }],
    ["a null fingerprint", card("pm_new", null)],
  ])("matches nothing for a card Stripe gave %s", async (_case, saved) => {
    calls.retrieve.mockResolvedValue(saved)

    await expect(keep("pm_new")).resolves.toStrictEqual({ removed: 0 })
    expect(calls.list).not.toHaveBeenCalled()
    expect(calls.detach).not.toHaveBeenCalled()
  })

  it("accepts an expanded customer object on the saved card", async () => {
    calls.retrieve.mockResolvedValue(card("pm_new", "fp_visa", { id: "cus_1" }))

    await expect(keep("pm_new")).resolves.toStrictEqual({ removed: 1 })
  })

  it("refuses a card that belongs to another customer", async () => {
    calls.retrieve.mockResolvedValue(card("pm_new", "fp_visa", "cus_someone_else"))

    await expect(keep("pm_new")).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(calls.detach).not.toHaveBeenCalled()
  })

  it("refuses a caller who has no Stripe customer", async () => {
    calls.getCustomerId.mockResolvedValue(undefined)

    await expect(keep("pm_new")).rejects.toMatchObject({ code: ERROR_CODES.NOT_FOUND })
    expect(calls.retrieve).not.toHaveBeenCalled()
  })

  it("rejects an empty payment method id before calling Stripe", async () => {
    await expect(keep("   ")).rejects.toThrow()
    expect(calls.retrieve).not.toHaveBeenCalled()
  })
})

describe("removeDuplicateSavedCardsMutation", () => {
  it("sends the saved card to the server", async () => {
    await expect(
      removeDuplicateSavedCardsMutation.mutationFn?.({ paymentMethodId: "pm_new" }, { client: new QueryClient(), meta: undefined }),
    ).resolves.toStrictEqual({ removed: 1 })
  })
})
