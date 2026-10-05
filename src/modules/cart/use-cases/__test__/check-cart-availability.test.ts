import { keepPreviousData } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CART_LINES_MAX, CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { checkCartAvailability, checkCartAvailabilityQuery } from "~/src/modules/cart/use-cases/check-cart-availability"

const captured = vi.hoisted((): { validate?: (input: unknown) => unknown } => ({}))

const inventory = vi.hoisted(() => ({ availability: vi.fn(() => Promise.resolve(new Map<string, number>())) }))

const payments = vi.hoisted(() => ({
  heldLines: vi.fn<(transactionId: string) => Promise<{ qty: number; variantId: string }[]>>(() => Promise.resolve([])),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({ getAvailabilityByVariantIds: inventory.availability }))
vi.mock("~/src/modules/payment/payment.accessors", () => ({ getHeldLinesByTransactionId: payments.heldLines }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: unknown) => handler,
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        captured.validate = validate

        return builder
      },
    }

    return builder
  },
}))

const withAvailability = (entries: readonly (readonly [string, number])[]) => {
  inventory.availability.mockResolvedValue(new Map(entries))
}

describe("checkCartAvailability", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("reports no issues when every line is fully stocked", async () => {
    withAvailability([
      ["variant-a", 5],
      ["variant-b", 2],
    ])

    const result = await checkCartAvailability({
      data: {
        lines: [
          { qty: 3, variantId: "variant-a" },
          { qty: 2, variantId: "variant-b" },
        ],
      },
    })

    expect(result).toStrictEqual({ hasUnavailableItems: false, issues: [] })
  })

  it("treats availability equal to the requested quantity as sufficient", async () => {
    withAvailability([["variant-a", 4]])

    const result = await checkCartAvailability({ data: { lines: [{ qty: 4, variantId: "variant-a" }] } })

    expect(result.hasUnavailableItems).toBe(false)
  })

  it("reports the available count for a short line", async () => {
    withAvailability([["variant-a", 1]])

    const result = await checkCartAvailability({ data: { lines: [{ qty: 3, variantId: "variant-a" }] } })

    expect(result).toStrictEqual({
      hasUnavailableItems: true,
      issues: [{ available: 1, qty: 3, variantId: "variant-a" }],
    })
  })

  it("treats a variant missing from the availability map as out of stock", async () => {
    withAvailability([])

    const result = await checkCartAvailability({ data: { lines: [{ qty: 1, variantId: "variant-ghost" }] } })

    expect(result.issues).toStrictEqual([{ available: 0, qty: 1, variantId: "variant-ghost" }])
  })

  it("keeps only the short lines and preserves their order", async () => {
    withAvailability([
      ["variant-a", 10],
      ["variant-b", 0],
      ["variant-c", 1],
    ])

    const result = await checkCartAvailability({
      data: {
        lines: [
          { qty: 1, variantId: "variant-a" },
          { qty: 2, variantId: "variant-b" },
          { qty: 2, variantId: "variant-c" },
        ],
      },
    })

    expect(result.issues).toStrictEqual([
      { available: 0, qty: 2, variantId: "variant-b" },
      { available: 1, qty: 2, variantId: "variant-c" },
    ])
  })

  it("asks the inventory accessor for exactly the requested variant ids", async () => {
    withAvailability([["variant-a", 1]])

    await checkCartAvailability({
      data: {
        lines: [
          { qty: 1, variantId: "variant-a" },
          { qty: 1, variantId: "variant-b" },
        ],
      },
    })

    expect(inventory.availability).toHaveBeenCalledWith(["variant-a", "variant-b"])
  })

  it("returns no issues for an empty cart", async () => {
    withAvailability([])

    const result = await checkCartAvailability({ data: { lines: [] } })

    expect(result).toStrictEqual({ hasUnavailableItems: false, issues: [] })
    expect(inventory.availability).toHaveBeenCalledWith([])
  })

  it("never looks for held stock when the browser holds no checkout", async () => {
    withAvailability([["variant-a", 1]])

    await checkCartAvailability({ data: { lines: [{ qty: 1, variantId: "variant-a" }] } })

    expect(payments.heldLines).not.toHaveBeenCalled()
  })
})

describe("checkCartAvailability for a browser that holds an open checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("counts the units its own checkout holds as still available to it", async () => {
    withAvailability([["variant-a", 0]])
    payments.heldLines.mockResolvedValue([{ qty: 1, variantId: "variant-a" }])

    const result = await checkCartAvailability({ data: { heldSessionId: "cs_test_held", lines: [{ qty: 1, variantId: "variant-a" }] } })

    expect(result).toStrictEqual({ hasUnavailableItems: false, issues: [] })
    expect(payments.heldLines).toHaveBeenCalledExactlyOnceWith("cs_test_held")
  })

  it("still reports a line the held units and the free stock together cannot cover", async () => {
    withAvailability([["variant-a", 1]])
    payments.heldLines.mockResolvedValue([
      { qty: 1, variantId: "variant-a" },
      { qty: 2, variantId: "variant-b" },
    ])

    const result = await checkCartAvailability({ data: { heldSessionId: "cs_test_held", lines: [{ qty: 3, variantId: "variant-a" }] } })

    expect(result.issues).toStrictEqual([{ available: 2, qty: 3, variantId: "variant-a" }])
  })

  it("adds up every held line of the same variant", async () => {
    withAvailability([["variant-a", 0]])
    payments.heldLines.mockResolvedValue([
      { qty: 1, variantId: "variant-a" },
      { qty: 1, variantId: "variant-a" },
    ])

    const result = await checkCartAvailability({ data: { heldSessionId: "cs_test_held", lines: [{ qty: 2, variantId: "variant-a" }] } })

    expect(result.hasUnavailableItems).toBe(false)
  })

  it("counts nothing extra for a session that no longer holds stock", async () => {
    withAvailability([["variant-a", 0]])
    payments.heldLines.mockResolvedValue([])

    const result = await checkCartAvailability({ data: { heldSessionId: "cs_test_expired", lines: [{ qty: 1, variantId: "variant-a" }] } })

    expect(result.issues).toStrictEqual([{ available: 0, qty: 1, variantId: "variant-a" }])
  })
})

describe("checkCartAvailability input validation", () => {
  it("accepts the largest cart checkout can carry", () => {
    const lines = Array.from({ length: CART_LINES_MAX }, (_, index) => ({ qty: 1, variantId: `variant-${String(index)}` }))

    expect(captured.validate?.({ lines })).toStrictEqual({ lines })
  })

  it("accepts the id of the checkout session the browser holds", () => {
    expect(captured.validate?.({ heldSessionId: "cs_test_held", lines: [] })).toStrictEqual({ heldSessionId: "cs_test_held", lines: [] })
  })

  it("accepts well formed lines", () => {
    expect(captured.validate?.({ lines: [{ qty: 2, variantId: "variant-a" }] })).toStrictEqual({
      lines: [{ qty: 2, variantId: "variant-a" }],
    })
  })

  it.each([
    ["a zero quantity", { lines: [{ qty: 0, variantId: "variant-a" }] }],
    ["a negative quantity", { lines: [{ qty: -1, variantId: "variant-a" }] }],
    ["a fractional quantity", { lines: [{ qty: 1.5, variantId: "variant-a" }] }],
    ["an empty variant id", { lines: [{ qty: 1, variantId: "" }] }],
    ["a variant id longer than any stored id", { lines: [{ qty: 1, variantId: "v".repeat(37) }] }],
    [
      "more lines than checkout can carry",
      { lines: Array.from({ length: CART_LINES_MAX + 1 }, (_, index) => ({ qty: 1, variantId: `variant-${String(index)}` })) },
    ],
    ["a missing lines array", {}],
    ["an empty held session id", { heldSessionId: "", lines: [] }],
    ["a held session id longer than Stripe issues", { heldSessionId: "c".repeat(256), lines: [] }],
    ["lines that are not an array", { lines: "variant-a" }],
  ])("rejects %s", (_name, input) => {
    expect(() => captured.validate?.(input)).toThrow()
  })
})

describe("checkCartAvailabilityQuery", () => {
  it("is disabled for an empty cart", () => {
    expect(checkCartAvailabilityQuery([], undefined).enabled).toBe(false)
  })

  it("is enabled once there is a line", () => {
    expect(checkCartAvailabilityQuery([{ qty: 1, variantId: "variant-a" }], undefined).enabled).toBe(true)
  })

  it("keys the query by the cart lines and the held session and never caches the answer", () => {
    const lines = [{ qty: 1, variantId: "variant-a" }]
    const options = checkCartAvailabilityQuery(lines, "cs_test_held")

    expect(options.queryKey).toStrictEqual([...CART_QUERY_KEYS.AVAILABILITY, lines, "cs_test_held"])
    expect(options.staleTime).toBe(0)
  })

  it("keeps the last answer on screen while a changed key is checked again", () => {
    expect(checkCartAvailabilityQuery([{ qty: 1, variantId: "variant-a" }], "cs_test_held").placeholderData).toBe(keepPreviousData)
  })

  it("does not check again because the shopper returned to the tab or the connection came back", () => {
    const options = checkCartAvailabilityQuery([{ qty: 1, variantId: "variant-a" }], "cs_test_held")

    expect(options.refetchOnWindowFocus).toBe(false)
    expect(options.refetchOnReconnect).toBe(false)
  })
})
