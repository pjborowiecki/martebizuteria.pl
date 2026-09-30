import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface AttributeRow {
  attributeId: string
  value: string
}

const { getByProductId } = vi.hoisted(() => ({
  getByProductId: vi.fn<(params: { productId: string }) => Promise<AttributeRow[]>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/attribute-on-product/attribute-on-product.server", () => ({
  getByProductIdQuery: { execute: getByProductId },
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler:
        (handler: (options: { data: unknown }) => unknown) =>
        (options: { data: unknown }): unknown =>
          handler({ data: builder.validate(options.data) }),
      middleware: () => builder,
      validate: (data: unknown) => data,
      validator: (validate: (data: unknown) => unknown) => {
        builder.validate = validate

        return builder
      },
    }

    return builder
  },
}))

import {
  ATTRIBUTE_ON_PRODUCT_QUERY_KEYS,
  ATTRIBUTE_ON_PRODUCT_QUERY_STALE_MS,
} from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { getProductAttributes, getProductAttributesQuery } from "~/src/modules/attribute-on-product/use-cases/get-product-attributes"

const rows: AttributeRow[] = [
  { attributeId: "attr-material", value: "gold" },
  { attributeId: "attr-weight", value: "14" },
]

beforeEach(() => {
  vi.clearAllMocks()
  getByProductId.mockResolvedValue(rows)
})

describe("getProductAttributes", () => {
  it("asks the accessor for the rows of the requested product", async () => {
    await getProductAttributes({ data: "product-1" })

    expect(getByProductId).toHaveBeenCalledWith({ productId: "product-1" })
  })

  it("returns the accessor rows untouched", async () => {
    await expect(getProductAttributes({ data: "product-1" })).resolves.toBe(rows)
  })

  it("refuses an empty product id", () => {
    expect(() => getProductAttributes({ data: "" })).toThrow()
    expect(getByProductId).not.toHaveBeenCalled()
  })

  it("returns an empty list for a product with no attribute rows", async () => {
    getByProductId.mockResolvedValue([])

    await expect(getProductAttributes({ data: "product-2" })).resolves.toStrictEqual([])
  })
})

describe("getProductAttributesQuery", () => {
  it("keys the cache entry by product id", () => {
    expect(getProductAttributesQuery("product-1").queryKey).toStrictEqual([...ATTRIBUTE_ON_PRODUCT_QUERY_KEYS.BY_PRODUCT_ID, "product-1"])
  })

  it("stays disabled until a product has been picked", () => {
    expect(getProductAttributesQuery("").enabled).toBe(false)
    expect(getProductAttributesQuery("product-1").enabled).toBe(true)
  })

  it("keeps the rows fresh for the configured window and never refetches on mount or focus", () => {
    const options = getProductAttributesQuery("product-1")

    expect(options.staleTime).toBe(ATTRIBUTE_ON_PRODUCT_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("fetches through the server function when the cache asks for data", async () => {
    await expect(new QueryClient().query(getProductAttributesQuery("product-9"))).resolves.toStrictEqual(rows)

    expect(getByProductId).toHaveBeenCalledWith({ productId: "product-9" })
  })
})
