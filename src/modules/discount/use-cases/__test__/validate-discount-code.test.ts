import { MutationObserver, QueryClient, skipToken } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import {
  DISCOUNT_MUTATION_KEYS,
  DISCOUNT_QUERY_KEYS,
  DISCOUNT_QUERY_STALE_MS,
  DISCOUNT_REJECTION,
  DISCOUNT_TYPE,
} from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import {
  validateDiscountCode,
  validateDiscountCodeMutation,
  validateDiscountCodeQuery,
} from "~/src/modules/discount/use-cases/validate-discount-code"

const stubs = vi.hoisted(() => ({
  getDiscountByCodeForPreviewQuery:
    vi.fn<
      (lookup: {
        code: string
        email: string | undefined
        heldSessionId: string | undefined
      }) => Promise<Discount["selectForPreview"] | undefined>
    >(),
  getOfferedDeliveryMethodByIdQuery: vi.fn<(id: string) => Promise<{ price: number; type: string } | undefined>>(),
  getRequestSession: vi.fn<() => Promise<{ user: { email: string } } | null>>(),
  getSellPricesByVariantIds: vi.fn<(variantIds: readonly string[]) => Promise<Map<string, number>>>(),
  withinRateLimit: vi.fn<(input: { key: string; limit: number; windowSeconds: number }) => Promise<boolean>>(),
}))

vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return { ...actual, getRequest: () => new Request("https://marte.test/checkout", { headers: { "cf-connecting-ip": "203.0.113.7" } }) }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: stubs.getRequestSession }))
vi.mock("~/src/lib/rate-limit", () => ({
  clientAddress: (headers: Headers) => headers.get("cf-connecting-ip"),
  withinRateLimit: stubs.withinRateLimit,
}))
vi.mock("~/src/modules/discount/discount.accessors", () => ({
  getDiscountByCodeForPreviewQuery: stubs.getDiscountByCodeForPreviewQuery,
}))
vi.mock("~/src/modules/product-variant/product-variant.accessors", () => ({
  getSellPricesByVariantIds: stubs.getSellPricesByVariantIds,
}))
vi.mock("~/src/modules/delivery-method/delivery-method.accessors", () => ({
  getOfferedDeliveryMethodByIdQuery: stubs.getOfferedDeliveryMethodByIdQuery,
}))

const NOW = new Date("2026-06-01T12:00:00.000Z")

const BASKET = {
  lines: [
    { qty: 2, variantId: "variant-ring" },
    { qty: 1, variantId: "variant-chain" },
  ],
}

const SELL_PRICES = new Map([
  ["variant-ring", 8000],
  ["variant-chain", 4000],
])

const discountRow = (overrides: Partial<Discount["selectForPreview"]> = {}): Discount["selectForPreview"] => ({
  code: "SPRING-24",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  description: null,
  endsAt: null,
  heldByOtherCheckouts: 0,
  heldForCustomer: 0,
  id: "discount-1",
  isActive: true,
  maxDiscountAmount: null,
  minOrderTotal: null,
  perCustomerLimit: null,
  redeemedByCustomer: 0,
  startsAt: null,
  type: DISCOUNT_TYPE.PERCENTAGE,
  updatedAt: new Date("2026-05-01T00:00:00.000Z"),
  usageCount: 0,
  usageLimit: null,
  value: 15,
  ...overrides,
})

beforeEach(() => {
  vi.clearAllMocks()
  vi.useFakeTimers({ now: NOW, toFake: ["Date"] })
  stubs.getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow())
  stubs.getOfferedDeliveryMethodByIdQuery.mockResolvedValue({ price: 1500, type: "courier" })
  stubs.getRequestSession.mockResolvedValue(null)
  stubs.getSellPricesByVariantIds.mockResolvedValue(SELL_PRICES)
  stubs.withinRateLimit.mockResolvedValue(true)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("validateDiscountCode", () => {
  it("counts every check against the client address at the checkout rate, in a bucket of its own", async () => {
    await validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })

    expect(stubs.withinRateLimit).toHaveBeenCalledExactlyOnceWith({ key: "discount-validate:203.0.113.7", limit: 10, windowSeconds: 60 })
  })

  it("refuses an address that checks codes faster than the rate allows, before reading any discount", async () => {
    stubs.withinRateLimit.mockResolvedValue(false)

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })).rejects.toMatchObject({
      code: ERROR_CODES.TOO_MANY_REQUESTS,
    })
    expect(stubs.getDiscountByCodeForPreviewQuery).not.toHaveBeenCalled()
  })

  it("applies a usable code and prices it against the basket at the shop's sell prices", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })).resolves.toStrictEqual({
      applied: { amountMinorUnits: 3000, code: "SPRING-24", discountId: "discount-1", type: DISCOUNT_TYPE.PERCENTAGE },
    })
    expect(stubs.getSellPricesByVariantIds).toHaveBeenCalledExactlyOnceWith(["variant-ring", "variant-chain"])
  })

  it("looks the code up however the shopper typed it", async () => {
    await validateDiscountCode({ data: { ...BASKET, code: " spring-24 " } })

    expect(stubs.getDiscountByCodeForPreviewQuery).toHaveBeenCalledWith({ code: "SPRING-24", email: undefined, heldSessionId: undefined })
  })

  it("says a code that matches no discount was not found", async () => {
    stubs.getDiscountByCodeForPreviewQuery.mockResolvedValue(undefined)

    await expect(validateDiscountCode({ data: { ...BASKET, code: "NOPE-99" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.NOT_FOUND,
    })
  })

  it("explains why a code that exists cannot be used yet", async () => {
    stubs.getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow({ startsAt: new Date("2026-07-01T00:00:00.000Z") }))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.NOT_STARTED,
    })
  })

  it("counts earlier redemptions against the email typed at checkout without reading the session", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { email: "account@marte.test" } })

    await validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", email: "ada@marte.test" } })

    expect(stubs.getDiscountByCodeForPreviewQuery).toHaveBeenCalledExactlyOnceWith({
      code: "SPRING-24",
      email: "ada@marte.test",
      heldSessionId: undefined,
    })
    expect(stubs.getRequestSession).not.toHaveBeenCalled()
  })

  it("counts earlier redemptions against the signed-in account when no email was typed", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { email: "account@marte.test" } })

    await validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", email: "" } })

    expect(stubs.getDiscountByCodeForPreviewQuery).toHaveBeenCalledExactlyOnceWith({
      code: "SPRING-24",
      email: "account@marte.test",
      heldSessionId: undefined,
    })
  })

  it("waits for the session before it reads the discount when no email was typed", async () => {
    const session = Promise.withResolvers<{ user: { email: string } } | null>()
    stubs.getRequestSession.mockReturnValue(session.promise)

    const validation = validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })
    await vi.waitFor(() => {
      expect(stubs.getRequestSession).toHaveBeenCalledOnce()
    })

    expect(stubs.getDiscountByCodeForPreviewQuery).not.toHaveBeenCalled()
    session.resolve({ user: { email: "account@marte.test" } })
    await validation
    expect(stubs.getDiscountByCodeForPreviewQuery).toHaveBeenCalledExactlyOnceWith({
      code: "SPRING-24",
      email: "account@marte.test",
      heldSessionId: undefined,
    })
  })

  it("checks a guest without an email against no one", async () => {
    await validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })

    expect(stubs.getDiscountByCodeForPreviewQuery).toHaveBeenCalledExactlyOnceWith({
      code: "SPRING-24",
      email: undefined,
      heldSessionId: undefined,
    })
  })

  it("turns down a code the shopper has already used up", async () => {
    stubs.getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow({ perCustomerLimit: 1, redeemedByCustomer: 1 }))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", email: "ada@marte.test" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.ALREADY_USED,
    })
  })

  it("rejects a code with characters a discount code cannot contain", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING 24!" } })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    expect(stubs.getDiscountByCodeForPreviewQuery).not.toHaveBeenCalled()
  })

  it("refuses a basket line without a quantity before reading anything", async () => {
    await expect(
      validateDiscountCode({ data: { code: "SPRING-24", lines: [{ qty: 0, variantId: "variant-ring" }] } }),
    ).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
    expect(stubs.getSellPricesByVariantIds).not.toHaveBeenCalled()
  })
})

describe("validateDiscountCode prices the basket from the shop", () => {
  it("prices the basket again when the shop changes a price", async () => {
    stubs.getSellPricesByVariantIds.mockResolvedValue(new Map([...SELL_PRICES, ["variant-chain", 14_000]]))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })).resolves.toMatchObject({
      applied: { amountMinorUnits: 4500 },
    })
  })

  it("leaves out of the subtotal a line the shop no longer prices", async () => {
    stubs.getSellPricesByVariantIds.mockResolvedValue(new Map([["variant-ring", 8000]]))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })).resolves.toMatchObject({
      applied: { amountMinorUnits: 2400 },
    })
  })

  it("holds the minimum order against the subtotal the shop prices", async () => {
    stubs.getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow({ minOrderTotal: 20_001 }))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.MIN_ORDER_NOT_MET,
    })
  })

  it("prices a free-delivery code at the cost of the delivery method the shop offers", async () => {
    stubs.getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow({ type: DISCOUNT_TYPE.FREE_SHIPPING, value: 0 }))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", deliveryMethodId: "dm-courier" } })).resolves.toMatchObject({
      applied: { amountMinorUnits: 1500, type: DISCOUNT_TYPE.FREE_SHIPPING },
    })
    expect(stubs.getOfferedDeliveryMethodByIdQuery).toHaveBeenCalledExactlyOnceWith("dm-courier")
  })

  it("takes nothing off for delivery before the shopper chooses a method", async () => {
    stubs.getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow({ type: DISCOUNT_TYPE.FREE_SHIPPING, value: 0 }))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })).resolves.toMatchObject({
      applied: { amountMinorUnits: 0 },
    })
    expect(stubs.getOfferedDeliveryMethodByIdQuery).not.toHaveBeenCalled()
  })

  it("takes nothing off for a delivery method the shop no longer offers", async () => {
    stubs.getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow({ type: DISCOUNT_TYPE.FREE_SHIPPING, value: 0 }))
    stubs.getOfferedDeliveryMethodByIdQuery.mockResolvedValue(undefined)

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", deliveryMethodId: "dm-retired" } })).resolves.toMatchObject({
      applied: { amountMinorUnits: 0 },
    })
  })

  it("does not read the delivery method for a code whose amount does not depend on it", async () => {
    await validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", deliveryMethodId: "dm-courier" } })

    expect(stubs.getOfferedDeliveryMethodByIdQuery).not.toHaveBeenCalled()
  })
})

describe("validateDiscountCode counts the uses open checkouts hold", () => {
  it("leaves the uses held by the shopper's own open checkout out of the count", async () => {
    await validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", heldSessionId: "cs_test_own" } })

    expect(stubs.getDiscountByCodeForPreviewQuery).toHaveBeenCalledExactlyOnceWith({
      code: "SPRING-24",
      email: undefined,
      heldSessionId: "cs_test_own",
    })
  })

  it("turns down a code whose remaining uses other checkouts hold", async () => {
    stubs.getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow({ heldByOtherCheckouts: 1, usageCount: 2, usageLimit: 3 }))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.HELD,
    })
  })

  it("turns down a code the shopper's limit allows only once while another of their checkouts holds it", async () => {
    stubs.getDiscountByCodeForPreviewQuery.mockResolvedValue(discountRow({ heldForCustomer: 1, perCustomerLimit: 1 }))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", email: "ada@marte.test" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.HELD,
    })
  })
})

describe("validateDiscountCodeQuery", () => {
  it("does not ask the server until the shopper has entered a code", () => {
    expect(validateDiscountCodeQuery({ ...BASKET, code: undefined }).queryFn).toBe(skipToken)
    expect(validateDiscountCodeQuery({ ...BASKET, code: "" }).queryFn).toBe(skipToken)
  })

  it("keys the check by the code and the basket, delivery, e-mail and open checkout it was priced against", () => {
    const basket = { ...BASKET, deliveryMethodId: "dm-courier", email: "ada@marte.test", heldSessionId: "cs_test_own" }

    expect(validateDiscountCodeQuery({ ...basket, code: "SPRING-24" }).queryKey).toStrictEqual([
      ...DISCOUNT_QUERY_KEYS.VALIDATION,
      { ...basket, code: "SPRING-24" },
    ])
  })

  it("keeps a check for the discount stale window", () => {
    expect(validateDiscountCodeQuery({ ...BASKET, code: "SPRING-24" }).staleTime).toBe(DISCOUNT_QUERY_STALE_MS)
  })

  it("checks the entered code through the server function", async () => {
    await expect(new QueryClient().query(validateDiscountCodeQuery({ ...BASKET, code: "spring-24" }))).resolves.toStrictEqual({
      applied: { amountMinorUnits: 3000, code: "SPRING-24", discountId: "discount-1", type: DISCOUNT_TYPE.PERCENTAGE },
    })
  })
})

describe("validateDiscountCodeMutation", () => {
  it("keys the mutation by the shared validate key", () => {
    expect(validateDiscountCodeMutation.mutationKey).toStrictEqual(DISCOUNT_MUTATION_KEYS.VALIDATE)
  })

  it("returns the check and caches it where the summary query will read it", async () => {
    const client = new QueryClient()
    const input = { ...BASKET, code: "SPRING-24" }

    const result = await new MutationObserver(client, validateDiscountCodeMutation).mutate(input)

    expect(result).toStrictEqual({
      applied: { amountMinorUnits: 3000, code: "SPRING-24", discountId: "discount-1", type: DISCOUNT_TYPE.PERCENTAGE },
    })
    expect(client.getQueryData(validateDiscountCodeQuery(input).queryKey)).toStrictEqual(result)
  })
})
