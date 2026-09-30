import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const validated = vi.hoisted((): { parse?: (input: unknown) => unknown } => ({}))

const mutations = vi.hoisted(() => ({ findTakenSkus: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/product/product.mutations", () => ({ findTakenSkus: mutations.findTakenSkus }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) => handler(options),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        validated.parse = validate

        return builder
      },
    }

    return builder
  },
}))

import { validateProductSkus } from "~/src/modules/product/use-cases/validate-product-skus"

const lastCall = () => mutations.findTakenSkus.mock.lastCall

beforeEach(() => {
  vi.clearAllMocks()
  mutations.findTakenSkus.mockResolvedValue([])
})

describe("validateProductSkus", () => {
  it("asks the catalog which of the submitted SKUs are already in use", async () => {
    await validateProductSkus({ data: { skus: ["RING-01", "RING-02"] } })

    expect(lastCall()?.[0]).toStrictEqual(["RING-01", "RING-02"])
  })

  it("checks a brand new product against every other product", async () => {
    await validateProductSkus({ data: { skus: ["RING-01"] } })

    expect(lastCall()?.[1]).toBeUndefined()
  })

  it("leaves the product being edited out of the clash check", async () => {
    await validateProductSkus({ data: { productId: "product-1", skus: ["RING-01"] } })

    expect(lastCall()?.[1]).toBe("product-1")
  })

  it("reports the SKUs that clash back to the form", async () => {
    mutations.findTakenSkus.mockResolvedValue(["RING-02"])

    await expect(validateProductSkus({ data: { skus: ["RING-01", "RING-02"] } })).resolves.toStrictEqual({ takenSkus: ["RING-02"] })
  })

  it("reports an empty list when nothing clashes", async () => {
    await expect(validateProductSkus({ data: { skus: ["RING-01"] } })).resolves.toStrictEqual({ takenSkus: [] })
  })
})

describe("validateProductSkus input validation", () => {
  it("trims each SKU before the lookup", () => {
    expect(validated.parse?.({ skus: ["  RING-01  ", "RING-02"] })).toStrictEqual({ skus: ["RING-01", "RING-02"] })
  })

  it("accepts an empty list of SKUs", () => {
    expect(validated.parse?.({ skus: [] })).toStrictEqual({ skus: [] })
  })

  it("keeps the product id when one is supplied", () => {
    expect(validated.parse?.({ productId: " product-1 ", skus: [] })).toStrictEqual({ productId: "product-1", skus: [] })
  })

  it("rejects a blank product id rather than treating it as absent", () => {
    expect(() => validated.parse?.({ productId: "   ", skus: [] })).toThrow()
  })

  it("rejects a request that carries no SKU list", () => {
    expect(() => validated.parse?.({})).toThrow()
  })

  it("rejects a SKU that is not text", () => {
    expect(() => validated.parse?.({ skus: [42] })).toThrow()
  })
})
