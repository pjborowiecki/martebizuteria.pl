import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { createCardSetupIntent, createCardSetupIntentMutation } from "../create-card-setup-intent"

const ANNA = { email: "anna@example.com", emailVerified: true, id: "user-1", isAnonymous: false, name: "Anna Kowalska" }

const calls = vi.hoisted(() => ({
  caller: { current: {} },
  createSetupIntent: vi.fn<(params: object) => Promise<{ client_secret: string | null; id: string }>>(),
  ensureCustomer: vi.fn<(input: { email: string; name: string; userId: string }) => Promise<string>>(),
  withRateLimit: vi.fn<(kind: string, limit: object) => object>(() => ({})),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  authorized: () => ({}),
  withRateLimit: calls.withRateLimit,
}))
vi.mock("~/src/integrations/stripe/stripe.customer.server", () => ({ ensureStripeCustomer: calls.ensureCustomer }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({ stripe: { setupIntents: { create: calls.createSetupIntent } } }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: unknown }) => unknown) => () =>
        handler({ context: { auth: { user: calls.caller.current } } }),
      middleware: () => builder,
    }

    return builder
  },
}))

const rateLimitsAppliedOnLoad = [...calls.withRateLimit.mock.calls]

beforeEach(() => {
  vi.clearAllMocks()
  calls.caller.current = ANNA
  calls.createSetupIntent.mockResolvedValue({ client_secret: "seti_1_secret_abc", id: "seti_1" })
  calls.ensureCustomer.mockResolvedValue("cus_1")
})

describe("createCardSetupIntent", () => {
  it("is rate limited like the other card endpoints", () => {
    expect(rateLimitsAppliedOnLoad).toStrictEqual([["create-card-setup-intent", { max: 3, window: 60 }]])
  })

  it("opens the Stripe customer of the signed-in shopper, creating it when they never paid", async () => {
    await createCardSetupIntent()

    expect(calls.ensureCustomer).toHaveBeenCalledWith({ email: "anna@example.com", name: "Anna Kowalska", userId: "user-1" })
  })

  it("asks Stripe to set up a card for that customer to reuse while they are present", async () => {
    await createCardSetupIntent()

    expect(calls.createSetupIntent).toHaveBeenCalledWith({
      customer: "cus_1",
      metadata: { userId: "user-1" },
      payment_method_types: ["card"],
      usage: "on_session",
    })
  })

  it("hands the browser only the client secret", async () => {
    await expect(createCardSetupIntent()).resolves.toStrictEqual({ clientSecret: "seti_1_secret_abc" })
  })

  it("fails instead of returning a setup intent the browser cannot confirm", async () => {
    calls.createSetupIntent.mockResolvedValue({ client_secret: null, id: "seti_1" })

    await expect(createCardSetupIntent()).rejects.toMatchObject({ code: ERROR_CODES.INTERNAL_ERROR })
  })

  it.each([
    ["an anonymous session", { ...ANNA, isAnonymous: true }],
    ["an account whose email is not verified", { ...ANNA, emailVerified: false }],
  ])("refuses %s before touching Stripe, so the endpoint cannot be used to test stolen cards", async (_case, caller) => {
    calls.caller.current = caller

    await expect(createCardSetupIntent()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(calls.ensureCustomer).not.toHaveBeenCalled()
    expect(calls.createSetupIntent).not.toHaveBeenCalled()
  })

  it("lets a Stripe customer failure surface without opening a setup intent", async () => {
    calls.ensureCustomer.mockRejectedValue(new Error("stripe is unreachable"))

    await expect(createCardSetupIntent()).rejects.toThrow("stripe is unreachable")
    expect(calls.createSetupIntent).not.toHaveBeenCalled()
  })
})

describe("createCardSetupIntentMutation", () => {
  it("opens a setup intent when the wallet page asks for one", async () => {
    await expect(
      createCardSetupIntentMutation.mutationFn?.(undefined, { client: new QueryClient(), meta: undefined }),
    ).resolves.toStrictEqual({ clientSecret: "seti_1_secret_abc" })
  })
})
