import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { execute } = vi.hoisted(() => ({ execute: vi.fn<(input: { handle: string }) => Promise<unknown>>() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("~/src/modules/product/product.accessors", () => ({ getPublishedProductByHandleQuery: { execute } }))
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

import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"
import { type PublishedProductByHandleRow } from "~/src/modules/product/product.utils"
import { getProduct, getProductQuery } from "~/src/modules/product/use-cases/get-product"

const NOW = new Date("2026-03-14T10:00:00.000Z")

const PRODUCT_ID = "prod-1"

const locales = (pl: string, en: string): { "en-US": string; "pl-PL": string } => ({ "en-US": en, "pl-PL": pl })

const variantRow = (quantityAvailable: number): PublishedProductByHandleRow["variants"][number] => ({
  attributes: [],
  barcode: null,
  compareAtPrice: null,
  createdAt: NOW,
  id: "var-1",
  images: [],
  inventory: { createdAt: NOW, id: "inv-1", quantityAvailable, quantityReserved: 0, updatedAt: NOW, variantId: "var-1", version: 1 },
  manageInventory: true,
  metadata: null,
  optionOnVariants: [],
  price: 12_000,
  productId: PRODUCT_ID,
  sku: null,
  title: "Default",
  updatedAt: NOW,
})

const publishedRow = (quantityAvailable = 5): PublishedProductByHandleRow => ({
  attributes: [],
  categories: [],
  collections: [],
  createdAt: NOW,
  descriptions: null,
  handle: "srebrny-pierscionek",
  id: PRODUCT_ID,
  images: [],
  metadata: null,
  options: [],
  primaryCategoryId: null,
  rank: 0,
  status: PRODUCT_STATUS.PUBLISHED,
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: locales("Srebrny pierścionek", "Silver ring"),
  updatedAt: NOW,
  variants: [variantRow(quantityAvailable)],
})

beforeEach(() => {
  execute.mockReset()
})

describe("getProduct", () => {
  it("maps a published in-stock product into the requested locale", async () => {
    execute.mockResolvedValue(publishedRow())

    const result = await getProduct({ data: { handle: "srebrny-pierscionek", locale: "en-US" } })

    expect(execute).toHaveBeenCalledWith({ handle: "srebrny-pierscionek" })
    expect(result).toMatchObject({ handle: "srebrny-pierscionek", id: PRODUCT_ID, title: "Silver ring" })
  })

  it("falls back to the default locale when none is supplied", async () => {
    execute.mockResolvedValue(publishedRow())

    const result = await getProduct({ data: { handle: "srebrny-pierscionek" } })

    expect(result).toMatchObject({ title: "Srebrny pierścionek" })
  })

  it("reports a missing product as false rather than throwing", async () => {
    execute.mockResolvedValue(undefined)

    await expect(getProduct({ data: { handle: "nieznany" } })).resolves.toBe(false)
  })

  it("hides a product whose every variant is sold out", async () => {
    execute.mockResolvedValue(publishedRow(0))

    await expect(getProduct({ data: { handle: "srebrny-pierscionek" } })).resolves.toBe(false)
  })

  it("rejects an empty handle before touching the database", async () => {
    await expect(getProduct({ data: { handle: "" } })).rejects.toThrow()
    expect(execute).not.toHaveBeenCalled()
  })
})

describe("getProductQuery", () => {
  it("keys the cache by handle and locale", () => {
    expect(getProductQuery("srebrny-pierscionek", "en-US").queryKey).toStrictEqual(["product", "srebrny-pierscionek", "en-US"])
  })

  it("defaults the cache key locale to the store default", () => {
    expect(getProductQuery("srebrny-pierscionek").queryKey).toStrictEqual(["product", "srebrny-pierscionek", "pl-PL"])
  })

  it("reads the product through the server function when fetched", async () => {
    execute.mockResolvedValue(publishedRow())

    const result = await new QueryClient().query(getProductQuery("srebrny-pierscionek", "en-US"))

    expect(result).toMatchObject({ title: "Silver ring" })
  })
})
