import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { loadAttributeOnProductRows, prepareAttributeOnProductBatch, runDrizzleBatch } = vi.hoisted(() => ({
  loadAttributeOnProductRows: vi.fn<(productId: string, productRows: unknown, variantGroups: unknown) => Promise<unknown[]>>(),
  prepareAttributeOnProductBatch: vi.fn<(productId: string, rows: unknown[]) => unknown[]>(),
  runDrizzleBatch: vi.fn<(statements: unknown[]) => Promise<void>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/drizzle-orm/drizzle.batch", () => ({ runDrizzleBatch }))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.utils", () => ({
  loadAttributeOnProductRows,
  prepareAttributeOnProductBatch,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validator?: (input: unknown) => unknown } = {}
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
        Promise.resolve(options.data)
          .then((data) => (state.validator === undefined ? data : state.validator(data)))
          .then((data) => handler({ data })),
      middleware: () => builder,
      validator: (validator: (input: unknown) => unknown) => {
        state.validator = validator

        return builder
      },
    }

    return builder
  },
}))

import { setAllProductAttributes } from "~/src/modules/attribute-on-product/use-cases/set-all-product-attributes"

const input = {
  productId: "product-1",
  productValues: [{ attributeId: "attr-material", value: "gold" }],
  variantValues: [{ values: [{ attributeId: "attr-size", value: "M" }], variantId: "variant-1" }],
}

beforeEach(() => {
  vi.clearAllMocks()
  loadAttributeOnProductRows.mockResolvedValue(["normalized row"])
  prepareAttributeOnProductBatch.mockReturnValue(["delete statement", "insert statement"])
  runDrizzleBatch.mockResolvedValue()
})

describe("setAllProductAttributes", () => {
  it("replaces the product attributes and renames each variant group to the persistence shape", async () => {
    await setAllProductAttributes({ data: input })

    expect(loadAttributeOnProductRows).toHaveBeenCalledWith(
      "product-1",
      [{ attributeId: "attr-material", value: "gold" }],
      [{ rows: [{ attributeId: "attr-size", value: "M" }], variantId: "variant-1" }],
    )
  })

  it("writes the normalized rows in one atomic batch", async () => {
    await setAllProductAttributes({ data: input })

    expect(prepareAttributeOnProductBatch).toHaveBeenCalledWith("product-1", ["normalized row"])
    expect(runDrizzleBatch).toHaveBeenCalledExactlyOnceWith(["delete statement", "insert statement"])
  })

  it("confirms which product was written", async () => {
    await expect(setAllProductAttributes({ data: input })).resolves.toStrictEqual({ ok: true, productId: "product-1" })
  })

  it("clears every attribute when both lists are empty", async () => {
    await setAllProductAttributes({ data: { productId: "product-1", productValues: [], variantValues: [] } })

    expect(loadAttributeOnProductRows).toHaveBeenCalledWith("product-1", [], [])
  })

  it("trims the values it was given before writing them", async () => {
    await setAllProductAttributes({
      data: { productId: "  product-1  ", productValues: [{ attributeId: "  attr-material  ", value: "  gold  " }], variantValues: [] },
    })

    expect(loadAttributeOnProductRows).toHaveBeenCalledWith("product-1", [{ attributeId: "attr-material", value: "gold" }], [])
  })

  it("keeps the rank an attribute row carries", async () => {
    await setAllProductAttributes({
      data: { productId: "product-1", productValues: [{ attributeId: "attr-material", rank: 2, value: "gold" }], variantValues: [] },
    })

    expect(loadAttributeOnProductRows).toHaveBeenCalledWith("product-1", [{ attributeId: "attr-material", rank: 2, value: "gold" }], [])
  })

  it("rejects an input without a product id", async () => {
    await expect(setAllProductAttributes({ data: { productId: "", productValues: [], variantValues: [] } })).rejects.toThrow()

    expect(runDrizzleBatch).not.toHaveBeenCalled()
  })

  it("rejects a variant group that names no variant", async () => {
    await expect(
      setAllProductAttributes({
        data: { productId: "product-1", productValues: [], variantValues: [{ values: [], variantId: "" }] },
      }),
    ).rejects.toThrow()

    expect(runDrizzleBatch).not.toHaveBeenCalled()
  })

  it("lets a failed write surface to the caller", async () => {
    runDrizzleBatch.mockRejectedValue(new Error("D1_ERROR: constraint failed"))

    await expect(setAllProductAttributes({ data: input })).rejects.toThrow("D1_ERROR: constraint failed")
  })
})
