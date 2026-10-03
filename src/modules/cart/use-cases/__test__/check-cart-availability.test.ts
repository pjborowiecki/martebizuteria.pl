import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CART_LINES_MAX, CART_QUERY_KEYS } from "~/src/modules/cart/cart.constants"
import { checkCartAvailability, checkCartAvailabilityQuery } from "~/src/modules/cart/use-cases/check-cart-availability"

const captured = vi.hoisted((): { validate?: (input: unknown) => unknown } => ({}))

const inventory = vi.hoisted(() => ({ availability: vi.fn(() => Promise.resolve(new Map<string, number>())) }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("~/src/modules/inventory/inventory.accessors", () => ({ getAvailabilityByVariantIds: inventory.availability }))
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
})

describe("checkCartAvailability input validation", () => {
  it("accepts the largest cart checkout can carry", () => {
    const lines = Array.from({ length: CART_LINES_MAX }, (_, index) => ({ qty: 1, variantId: `variant-${String(index)}` }))

    expect(captured.validate?.({ lines })).toStrictEqual({ lines })
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
    ["lines that are not an array", { lines: "variant-a" }],
  ])("rejects %s", (_name, input) => {
    expect(() => captured.validate?.(input)).toThrow()
  })
})

describe("checkCartAvailabilityQuery", () => {
  it("is disabled for an empty cart", () => {
    expect(checkCartAvailabilityQuery([]).enabled).toBe(false)
  })

  it("is enabled once there is a line", () => {
    expect(checkCartAvailabilityQuery([{ qty: 1, variantId: "variant-a" }]).enabled).toBe(true)
  })

  it("keys the query by the cart lines and never caches the answer", () => {
    const lines = [{ qty: 1, variantId: "variant-a" }]
    const options = checkCartAvailabilityQuery(lines)

    expect(options.queryKey).toStrictEqual([...CART_QUERY_KEYS.AVAILABILITY, lines])
    expect(options.staleTime).toBe(0)
  })
})
