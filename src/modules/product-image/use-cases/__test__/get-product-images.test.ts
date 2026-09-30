import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { PRODUCT_IMAGE_QUERY_KEYS } from "~/src/modules/product-image/product-image.constants"
import { getProductImages, getProductImagesQuery } from "~/src/modules/product-image/use-cases/get-product-images"
import { PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"

const captured = vi.hoisted((): { validate?: (input: unknown) => unknown } => ({}))

const server = vi.hoisted(() => ({
  execute: vi.fn<(params: { productId: string }) => Promise<{ id: string; rank: number }[]>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/product-image/product-image.server", () => ({ getProductImagesQuery: { execute: server.execute } }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) => handler(options),
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        captured.validate = validate

        return builder
      },
    }

    return builder
  },
}))

describe("getProductImages", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    server.execute.mockResolvedValue([])
  })

  it("asks the prepared statement for the requested product", async () => {
    await getProductImages({ data: "product-1" })

    expect(server.execute).toHaveBeenCalledWith({ productId: "product-1" })
  })

  it("hands the stored rows back untouched", async () => {
    const rows = [
      { id: "image-1", rank: 0 },
      { id: "image-2", rank: 1 },
    ]
    server.execute.mockResolvedValue(rows)

    await expect(getProductImages({ data: "product-1" })).resolves.toStrictEqual(rows)
  })
})

describe("getProductImages input validation", () => {
  it("accepts a product id", () => {
    expect(captured.validate?.("product-1")).toBe("product-1")
  })

  it.each([
    ["an empty id", ""],
    ["a numeric id", 1],
    ["a missing id", undefined],
  ])("rejects %s", (_label, input) => {
    expect(() => captured.validate?.(input)).toThrow()
  })
})

describe("getProductImagesQuery", () => {
  it("keys the query by product id", () => {
    const options = getProductImagesQuery("product-1")

    expect(options.queryKey).toStrictEqual([...PRODUCT_IMAGE_QUERY_KEYS.BY_PRODUCT_ID, "product-1"])
    expect(options.staleTime).toBe(PRODUCT_QUERY_STALE_MS)
  })

  it("stays disabled until a product is chosen", () => {
    expect(getProductImagesQuery("").enabled).toBe(false)
    expect(getProductImagesQuery("product-1").enabled).toBe(true)
  })
})

it("loads images for the cache key's product", async () => {
  server.execute.mockResolvedValue([{ id: "image-9", rank: 2 }])
  await expect(new QueryClient().query(getProductImagesQuery("product-9"))).resolves.toStrictEqual([{ id: "image-9", rank: 2 }])
  expect(server.execute).toHaveBeenLastCalledWith({ productId: "product-9" })
})
