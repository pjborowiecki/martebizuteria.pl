import { MutationObserver, QueryClient, skipToken } from "@tanstack/react-query"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { ZodError } from "zod"

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
  getDiscountByCodeForCustomerQuery:
    vi.fn<(code: string, email: string | undefined) => Promise<Discount["selectForCustomer"] | undefined>>(),
  getRequestSession: vi.fn<() => Promise<{ user: { email: string } } | null>>(),
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

  return { ...actual, getRequest: () => new Request("https://marte.test/checkout") }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: stubs.getRequestSession }))
vi.mock("~/src/modules/discount/discount.accessors", () => ({
  getDiscountByCodeForCustomerQuery: stubs.getDiscountByCodeForCustomerQuery,
}))

const NOW = new Date("2026-06-01T12:00:00.000Z")

const BASKET = { itemsSubtotal: 20_000, shippingTotal: 1500 }

const discountRow = (overrides: Partial<Discount["selectForCustomer"]> = {}): Discount["selectForCustomer"] => ({
  code: "SPRING-24",
  createdAt: new Date("2026-05-01T00:00:00.000Z"),
  description: null,
  endsAt: null,
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
  stubs.getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow())
  stubs.getRequestSession.mockResolvedValue(null)
})

afterEach(() => {
  vi.useRealTimers()
})

describe("validateDiscountCode", () => {
  it("applies a usable code and prices it against the basket", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })).resolves.toStrictEqual({
      applied: { amountMinorUnits: 3000, code: "SPRING-24", discountId: "discount-1", type: DISCOUNT_TYPE.PERCENTAGE },
    })
  })

  it("looks the code up however the shopper typed it", async () => {
    await validateDiscountCode({ data: { ...BASKET, code: " spring-24 " } })

    expect(stubs.getDiscountByCodeForCustomerQuery).toHaveBeenCalledWith("SPRING-24", undefined)
  })

  it("says a code that matches no discount was not found", async () => {
    stubs.getDiscountByCodeForCustomerQuery.mockResolvedValue(undefined)

    await expect(validateDiscountCode({ data: { ...BASKET, code: "NOPE-99" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.NOT_FOUND,
    })
  })

  it("explains why a code that exists cannot be used yet", async () => {
    stubs.getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow({ startsAt: new Date("2026-07-01T00:00:00.000Z") }))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.NOT_STARTED,
    })
  })

  it("counts earlier redemptions against the email typed at checkout without reading the session", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { email: "account@marte.test" } })

    await validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", email: "ada@marte.test" } })

    expect(stubs.getDiscountByCodeForCustomerQuery).toHaveBeenCalledExactlyOnceWith("SPRING-24", "ada@marte.test")
    expect(stubs.getRequestSession).not.toHaveBeenCalled()
  })

  it("counts earlier redemptions against the signed-in account when no email was typed", async () => {
    stubs.getRequestSession.mockResolvedValue({ user: { email: "account@marte.test" } })

    await validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", email: "" } })

    expect(stubs.getDiscountByCodeForCustomerQuery).toHaveBeenCalledExactlyOnceWith("SPRING-24", "account@marte.test")
  })

  it("waits for the session before it reads the discount when no email was typed", async () => {
    const session = Promise.withResolvers<{ user: { email: string } } | null>()
    stubs.getRequestSession.mockReturnValue(session.promise)

    const validation = validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })
    await vi.waitFor(() => {
      expect(stubs.getRequestSession).toHaveBeenCalledOnce()
    })

    expect(stubs.getDiscountByCodeForCustomerQuery).not.toHaveBeenCalled()
    session.resolve({ user: { email: "account@marte.test" } })
    await validation
    expect(stubs.getDiscountByCodeForCustomerQuery).toHaveBeenCalledExactlyOnceWith("SPRING-24", "account@marte.test")
  })

  it("checks a guest without an email against no one", async () => {
    await validateDiscountCode({ data: { ...BASKET, code: "SPRING-24" } })

    expect(stubs.getDiscountByCodeForCustomerQuery).toHaveBeenCalledExactlyOnceWith("SPRING-24", undefined)
  })

  it("turns down a code the shopper has already used up", async () => {
    stubs.getDiscountByCodeForCustomerQuery.mockResolvedValue(discountRow({ perCustomerLimit: 1, redeemedByCustomer: 1 }))

    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING-24", email: "ada@marte.test" } })).resolves.toStrictEqual({
      rejection: DISCOUNT_REJECTION.ALREADY_USED,
    })
  })

  it("rejects a code with characters a discount code cannot contain", async () => {
    await expect(validateDiscountCode({ data: { ...BASKET, code: "SPRING 24!" } })).rejects.toBeInstanceOf(ZodError)
    expect(stubs.getDiscountByCodeForCustomerQuery).not.toHaveBeenCalled()
  })
})

describe("validateDiscountCodeQuery", () => {
  it("does not ask the server until the shopper has entered a code", () => {
    expect(validateDiscountCodeQuery({ ...BASKET, code: undefined }).queryFn).toBe(skipToken)
    expect(validateDiscountCodeQuery({ ...BASKET, code: "" }).queryFn).toBe(skipToken)
  })

  it("keys the check by the code and the basket it was priced against", () => {
    expect(validateDiscountCodeQuery({ ...BASKET, code: "SPRING-24", email: "ada@marte.test" }).queryKey).toStrictEqual([
      ...DISCOUNT_QUERY_KEYS.VALIDATION,
      { ...BASKET, code: "SPRING-24", email: "ada@marte.test" },
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
