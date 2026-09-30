import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface MiddlewareCall {
  readonly key: string
  readonly limit: { max: number; window: number }
}

const state = vi.hoisted(() => ({
  createHandler: vi.fn((input: unknown) => Promise.resolve({ created: input })),
  middlewares: [] as MiddlewareCall[],
  updateHandler: vi.fn((input: unknown) => Promise.resolve({ updated: input })),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { CHECKOUT: { max: 10, window: 60 } },
  withRateLimit: (key: string, limit: { max: number; window: number }) => ({ key, limit }),
}))
vi.mock("~/src/integrations/stripe/stripe.actions.server", () => ({
  handleCreateCheckoutSession: state.createHandler,
  handleUpdateCheckoutSession: state.updateHandler,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) => handler({ data: options.data }),
      middleware: (entries: MiddlewareCall[]) => {
        state.middlewares.push(...entries)

        return builder
      },
      validator: (validate: (data: unknown) => unknown) => {
        Object.assign(builder, {
          handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
            handler({ data: validate(options.data) }),
        })

        return builder
      },
    }

    return builder
  },
}))

const { createCheckoutSessionFn, updateCheckoutSessionFn } = await import("~/src/integrations/stripe/stripe.actions")

const CHECKOUT_VALUES = {
  address1: "ul. Mokotowska 12/4",
  city: "Warszawa",
  countryCode: "PL",
  deliveryMethod: "dpd-courier",
  email: "anna@example.com",
  firstName: "Anna",
  lastName: "Kowalska",
  phone: "+48600123456",
  postalCode: "00-640",
}

const PARSED_CHECKOUT_VALUES = { ...CHECKOUT_VALUES, sameAsShipping: true, saveBillingAddress: false, saveShippingAddress: false }

const CART_ITEM = {
  id: "line-1",
  image: "https://assets.test/bracelet.jpg",
  price: "249,00 zł",
  qty: 2,
  rawPrice: 24_900,
  slug: "bransoletka-aurora",
  title: "Bransoletka Aurora",
  variantId: "variant-1",
  variantTitle: "Rozmiar M",
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("createCheckoutSessionFn", () => {
  it("hands a valid cart to the server handler and returns its answer", async () => {
    const data = { checkoutValues: CHECKOUT_VALUES, items: [CART_ITEM] }

    const result = await createCheckoutSessionFn({ data })

    expect(result).toStrictEqual({ created: { checkoutValues: PARSED_CHECKOUT_VALUES, items: [CART_ITEM] } })
    expect(state.createHandler).toHaveBeenCalledWith({ checkoutValues: PARSED_CHECKOUT_VALUES, items: [CART_ITEM] })
  })

  it("refuses an empty cart before reaching Stripe", () => {
    expect(() => createCheckoutSessionFn({ data: { checkoutValues: CHECKOUT_VALUES, items: [] } })).toThrow()
    expect(state.createHandler).not.toHaveBeenCalled()
  })

  it("refuses a cart line without a variant", () => {
    const data = { checkoutValues: CHECKOUT_VALUES, items: [{ ...CART_ITEM, variantId: "" }] }

    expect(() => createCheckoutSessionFn({ data })).toThrow()
    expect(state.createHandler).not.toHaveBeenCalled()
  })
})

describe("updateCheckoutSessionFn", () => {
  it("requires the session it is updating", () => {
    expect(() => updateCheckoutSessionFn({ data: { checkoutValues: CHECKOUT_VALUES, items: [CART_ITEM] } })).toThrow()
    expect(state.updateHandler).not.toHaveBeenCalled()
  })

  it("hands the session id and the cart to the server handler", async () => {
    const data = { checkoutValues: CHECKOUT_VALUES, items: [CART_ITEM], sessionId: "cs_test_1" }
    const expected = { checkoutValues: PARSED_CHECKOUT_VALUES, items: [CART_ITEM], sessionId: "cs_test_1" }

    const result = await updateCheckoutSessionFn({ data })

    expect(result).toStrictEqual({ updated: expected })
    expect(state.updateHandler).toHaveBeenCalledWith(expected)
  })
})

describe("checkout rate limiting", () => {
  it("guards both entry points with the shared checkout budget under separate keys", () => {
    expect(state.middlewares).toStrictEqual([
      { key: "checkout-create", limit: { max: 10, window: 60 } },
      { key: "checkout-update", limit: { max: 10, window: 60 } },
    ])
  })
})
