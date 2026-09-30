import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const accessors = vi.hoisted(() => ({ related: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("~/src/modules/product/product.accessors", () => ({ getPublishedRelatedProducts: accessors.related }))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validate: ((input: unknown) => unknown) | undefined } = { validate: undefined }
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => async (options: { data: unknown }) => {
        await Promise.resolve()

        return handler({ data: state.validate === undefined ? options.data : state.validate(options.data) })
      },
      middleware: () => builder,
      validator: (validate: (input: unknown) => unknown) => {
        state.validate = validate

        return builder
      },
    }

    return builder
  },
}))

import { PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { getRelatedProducts, getRelatedProductsQuery } from "~/src/modules/product/use-cases/get-related-products"

const RELATED = [{ handle: "bransoletka-aurora", id: "product-2" }]

beforeEach(() => {
  vi.clearAllMocks()
  accessors.related.mockResolvedValue(RELATED)
})

describe("getRelatedProducts", () => {
  it("looks the siblings up in the category and excludes the product itself", async () => {
    await expect(getRelatedProducts({ data: { categoryId: "category-1", excludeProductId: "product-1", locale: "en-US" } })).resolves.toBe(
      RELATED,
    )

    expect(accessors.related).toHaveBeenCalledExactlyOnceWith("category-1", "product-1")
  })

  it("returns nothing for a product that belongs to no category", async () => {
    await expect(getRelatedProducts({ data: { categoryId: null, excludeProductId: "product-1", locale: "en-US" } })).resolves.toStrictEqual(
      [],
    )
    expect(accessors.related).not.toHaveBeenCalled()
  })

  it("returns nothing when the category is left out entirely", async () => {
    await expect(getRelatedProducts({ data: { excludeProductId: "product-1", locale: "en-US" } })).resolves.toStrictEqual([])
    expect(accessors.related).not.toHaveBeenCalled()
  })

  it("refuses a request without the product to exclude", async () => {
    await expect(getRelatedProducts({ data: { categoryId: "category-1", excludeProductId: "", locale: "en-US" } })).rejects.toThrow()
    expect(accessors.related).not.toHaveBeenCalled()
  })

  it("ignores the locale, which only shapes the cache key", async () => {
    await expect(getRelatedProducts({ data: { categoryId: "category-1", excludeProductId: "product-1", locale: "" } })).resolves.toBe(
      RELATED,
    )
  })
})

describe("getRelatedProductsQuery", () => {
  it("keys the cache entry by category, product and locale", () => {
    const options = getRelatedProductsQuery("category-1", "product-1", "en-US")

    expect(options.queryKey).toStrictEqual([...PRODUCT_QUERY_KEYS.RELATED_BY_CATEGORY, "category-1", "product-1", "en-US"])
  })

  it("keeps a missing category in the key so it does not collide with a real one", () => {
    const options = getRelatedProductsQuery(null, "product-1", "en-US")

    expect(options.queryKey).toStrictEqual([...PRODUCT_QUERY_KEYS.RELATED_BY_CATEGORY, null, "product-1", "en-US"])
  })

  it("defaults the locale to the store default", () => {
    const options = getRelatedProductsQuery("category-1", "product-1")

    expect(options.queryKey).toStrictEqual([...PRODUCT_QUERY_KEYS.RELATED_BY_CATEGORY, "category-1", "product-1", "pl-PL"])
  })
})

it("loads related products for the cached category and excluded product", async () => {
  await expect(new QueryClient().query(getRelatedProductsQuery("category-1", "product-1", "en-US"))).resolves.toStrictEqual(RELATED)
  expect(accessors.related).toHaveBeenCalledExactlyOnceWith("category-1", "product-1")
})
