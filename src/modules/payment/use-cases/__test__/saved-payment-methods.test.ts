import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { PAYMENT_METHOD_MUTATION_KEYS, PAYMENT_METHOD_QUERY_KEYS } from "~/src/modules/payment/payment.constants"

import { deleteSavedPaymentMethod, deleteSavedPaymentMethodMutation } from "../delete-saved-payment-method"
import { listSavedPaymentMethods, listSavedPaymentMethodsQuery } from "../list-saved-payment-methods"

const USER_ID = "user-1"

const stripeCalls = vi.hoisted(() => ({
  detach: vi.fn<(id: string) => Promise<unknown>>(),
  getCustomerId: vi.fn<() => Promise<string | undefined>>(),
  list: vi.fn<() => Promise<{ data: unknown[] }>>(),
  retrieve: vi.fn<(id: string) => Promise<{ customer: unknown }>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { limit: 5, windowSeconds: 60 } },
  authorized: () => ({}),
  withRateLimit: () => ({}),
}))
vi.mock("~/src/integrations/stripe/stripe.customer.server", () => ({ getStripeCustomerId: stripeCalls.getCustomerId }))
vi.mock("~/src/integrations/stripe/stripe.server", () => ({
  stripe: { paymentMethods: { detach: stripeCalls.detach, list: stripeCalls.list, retrieve: stripeCalls.retrieve } },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options?: { data?: unknown }) =>
        handler({ context: { auth: { user: { id: USER_ID } } }, data: options?.data }),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        const validating = {
          handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options?: { data?: unknown }) =>
            Promise.resolve(options?.data).then((data) => handler({ context: { auth: { user: { id: USER_ID } } }, data: validate(data) })),
          middleware: () => validating,
          validator: () => validating,
        }

        return validating
      },
    }

    return builder
  },
}))

const cardMethod = (overrides: Record<string, unknown> = {}) => ({
  card: { brand: "visa", exp_month: 4, exp_year: 2030, last4: "4242" },
  id: "pm_visa",
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date("2026-10-01T00:00:00.000Z"))
  stripeCalls.getCustomerId.mockResolvedValue("cus_1")
  stripeCalls.list.mockResolvedValue({ data: [] })
  stripeCalls.detach.mockResolvedValue(undefined)
  stripeCalls.retrieve.mockResolvedValue({ customer: "cus_1" })
})

afterEach(() => {
  vi.useRealTimers()
})

describe("listSavedPaymentMethods", () => {
  it("reads only the cards held by the caller's own Stripe customer", async () => {
    await listSavedPaymentMethods()

    expect(stripeCalls.getCustomerId).toHaveBeenCalledWith(USER_ID)
    expect(stripeCalls.list).toHaveBeenCalledWith({ customer: "cus_1", type: "card" })
  })

  it("returns an empty wallet without calling Stripe for a customer who never paid", async () => {
    stripeCalls.getCustomerId.mockResolvedValue(undefined)

    await expect(listSavedPaymentMethods()).resolves.toStrictEqual([])
    expect(stripeCalls.list).not.toHaveBeenCalled()
  })

  it("describes each card by brand, last four digits and expiry", async () => {
    stripeCalls.list.mockResolvedValue({ data: [cardMethod()] })

    await expect(listSavedPaymentMethods()).resolves.toStrictEqual([
      { brand: "visa", expMonth: 4, expYear: 2030, id: "pm_visa", isExpired: false, last4: "4242" },
    ])
  })

  it("flags a card whose year has passed", async () => {
    stripeCalls.list.mockResolvedValue({ data: [cardMethod({ card: { brand: "visa", exp_month: 12, exp_year: 2025, last4: "4242" } })] })

    const [method] = await listSavedPaymentMethods()

    expect(method?.isExpired).toBe(true)
  })

  it("flags a card that expired earlier this year", async () => {
    stripeCalls.list.mockResolvedValue({ data: [cardMethod({ card: { brand: "visa", exp_month: 9, exp_year: 2026, last4: "4242" } })] })

    const [method] = await listSavedPaymentMethods()

    expect(method?.isExpired).toBe(true)
  })

  it("treats a card expiring this month as still usable", async () => {
    stripeCalls.list.mockResolvedValue({ data: [cardMethod({ card: { brand: "visa", exp_month: 10, exp_year: 2026, last4: "4242" } })] })

    const [method] = await listSavedPaymentMethods()

    expect(method?.isExpired).toBe(false)
  })

  it("skips a payment method that carries no card", async () => {
    stripeCalls.list.mockResolvedValue({ data: [{ id: "pm_blik" }, cardMethod()] })

    const methods = await listSavedPaymentMethods()

    expect(methods.map((method) => method.id)).toStrictEqual(["pm_visa"])
  })

  it("is cached under the saved-methods key", () => {
    expect(listSavedPaymentMethodsQuery().queryKey).toStrictEqual(PAYMENT_METHOD_QUERY_KEYS.SAVED)
  })
})

describe("deleteSavedPaymentMethod", () => {
  it("detaches a card the caller owns", async () => {
    await expect(deleteSavedPaymentMethod({ data: { paymentMethodId: "pm_visa" } })).resolves.toStrictEqual({ ok: true })
    expect(stripeCalls.detach).toHaveBeenCalledWith("pm_visa")
  })

  it("accepts an expanded customer object on the retrieved method", async () => {
    stripeCalls.retrieve.mockResolvedValue({ customer: { id: "cus_1" } })

    await expect(deleteSavedPaymentMethod({ data: { paymentMethodId: "pm_visa" } })).resolves.toStrictEqual({ ok: true })
  })

  it("refuses to detach a card belonging to another customer", async () => {
    stripeCalls.retrieve.mockResolvedValue({ customer: "cus_someone_else" })

    await expect(deleteSavedPaymentMethod({ data: { paymentMethodId: "pm_visa" } })).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
    })
    expect(stripeCalls.detach).not.toHaveBeenCalled()
  })

  it("refuses to detach a card that is attached to nobody", async () => {
    stripeCalls.retrieve.mockResolvedValue({ customer: null })

    await expect(deleteSavedPaymentMethod({ data: { paymentMethodId: "pm_visa" } })).rejects.toMatchObject({
      code: ERROR_CODES.FORBIDDEN,
    })
  })

  it("has nothing to detach for a caller with no Stripe customer", async () => {
    stripeCalls.getCustomerId.mockResolvedValue(undefined)

    await expect(deleteSavedPaymentMethod({ data: { paymentMethodId: "pm_visa" } })).rejects.toMatchObject({
      code: ERROR_CODES.NOT_FOUND,
    })
    expect(stripeCalls.retrieve).not.toHaveBeenCalled()
  })

  it("rejects a blank payment method id", async () => {
    await expect(deleteSavedPaymentMethod({ data: { paymentMethodId: "  " } })).rejects.toThrow()
    expect(stripeCalls.getCustomerId).not.toHaveBeenCalled()
  })

  it("is keyed so the UI can track the removal", () => {
    expect(deleteSavedPaymentMethodMutation.mutationKey).toStrictEqual(PAYMENT_METHOD_MUTATION_KEYS.DELETE)
  })
})
