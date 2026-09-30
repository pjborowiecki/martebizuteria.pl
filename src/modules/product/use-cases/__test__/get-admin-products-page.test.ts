import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const collaborators = vi.hoisted(() => ({
  aggregates: vi.fn(),
  filterParams: vi.fn(),
  page: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn() }))
vi.mock("~/src/modules/product/product.accessors", () => ({ getAdminProductsPage: collaborators.page }))
vi.mock("~/src/modules/product/product.admin-list.server", () => ({
  buildAdminProductsFilterParams: collaborators.filterParams,
  loadAdminListAggregates: collaborators.aggregates,
}))
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

import { ADMIN_PRODUCTS_PAGE_SIZE, PRODUCT_QUERY_KEYS, PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"
import { getAdminProductsPage, getAdminProductsPageQuery } from "~/src/modules/product/use-cases/get-admin-products-page"

const TIMESTAMP = new Date("2024-01-01T00:00:00.000Z")

const productRow = (overrides: Record<string, unknown> = {}) => ({
  attributes: [],
  categories: [],
  collections: [],
  createdAt: TIMESTAMP,
  descriptions: null,
  handle: "bransoletka-aurora",
  id: "product-1",
  metadata: null,
  primaryCategoryId: null,
  rank: 1,
  status: "published",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": "Aurora Bracelet", "pl-PL": "Bransoletka Aurora" },
  updatedAt: TIMESTAMP,
  ...overrides,
})

const EMPTY_AGGREGATES = { skuSummaryByProductId: new Map<string, string>(), statsByProductId: new Map<string, never>() }

beforeEach(() => {
  vi.clearAllMocks()
  collaborators.filterParams.mockReturnValue({ status: undefined })
  collaborators.page.mockResolvedValue({ rows: [], total: 0 })
  collaborators.aggregates.mockResolvedValue(EMPTY_AGGREGATES)
})

describe("getAdminProductsPage paging", () => {
  it("asks for the first page of the default size when neither is given", async () => {
    await getAdminProductsPage({ data: {} })

    expect(collaborators.page).toHaveBeenCalledWith(expect.objectContaining({ limit: ADMIN_PRODUCTS_PAGE_SIZE, offset: 0 }))
  })

  it("turns a page number into an offset of whole pages", async () => {
    await getAdminProductsPage({ data: { page: 3, pageSize: 10 } })

    expect(collaborators.page).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 20 }))
  })

  it("clamps a page below the first one back to the start of the list", async () => {
    await getAdminProductsPage({ data: { page: 1, pageSize: 10 } })

    expect(collaborators.page).toHaveBeenCalledWith(expect.objectContaining({ offset: 0 }))
  })

  it("passes the filters the shared builder produced straight through", async () => {
    collaborators.filterParams.mockReturnValue({ search: "aurora", status: "published" })

    await getAdminProductsPage({ data: { search: "aurora", status: "published" } })

    expect(collaborators.filterParams).toHaveBeenCalledWith({ search: "aurora", status: "published" })
    expect(collaborators.page).toHaveBeenCalledWith(expect.objectContaining({ search: "aurora", status: "published" }))
  })

  it("reports the page window beside the unpaginated total", async () => {
    collaborators.page.mockResolvedValue({ rows: [], total: 57 })

    await expect(getAdminProductsPage({ data: { page: 2, pageSize: 10 } })).resolves.toStrictEqual({
      hasMore: true,
      items: [],
      limit: 10,
      offset: 10,
      total: 57,
    })
  })

  it("reports no further pages once the window reaches the total", async () => {
    collaborators.page.mockResolvedValue({ rows: [productRow()], total: 11 })

    const result = await getAdminProductsPage({ data: { page: 2, pageSize: 10 } })

    expect(result.hasMore).toBe(false)
  })

  it("rejects a page size the schema does not allow", async () => {
    await expect(getAdminProductsPage({ data: { pageSize: 0 } })).rejects.toThrow()
    expect(collaborators.page).not.toHaveBeenCalled()
  })
})

describe("getAdminProductsPage rows", () => {
  it("loads the aggregates only for the rows this page returned", async () => {
    const rows = [productRow()]
    collaborators.page.mockResolvedValue({ rows, total: 1 })

    await getAdminProductsPage({ data: {} })

    expect(collaborators.aggregates).toHaveBeenCalledExactlyOnceWith(rows)
  })

  it("folds the variant statistics into each list item", async () => {
    collaborators.page.mockResolvedValue({ rows: [productRow()], total: 1 })
    collaborators.aggregates.mockResolvedValue({
      skuSummaryByProductId: new Map([["product-1", "SKU-1, SKU-2"]]),
      statsByProductId: new Map([["product-1", { minPrice: 24_900, totalStock: 6, variantCount: 2 }]]),
    })

    const result = await getAdminProductsPage({ data: {} })

    expect(result.items[0]).toMatchObject({
      handle: "bransoletka-aurora",
      minPrice: 24_900,
      skuSummary: "SKU-1, SKU-2",
      totalStock: 6,
      variantCount: 2,
    })
  })

  it("treats a product without statistics as having no stock and no variants", async () => {
    collaborators.page.mockResolvedValue({ rows: [productRow()], total: 1 })

    const result = await getAdminProductsPage({ data: {} })

    expect(result.items[0]).toMatchObject({ minPrice: undefined, totalStock: 0, variantCount: 0 })
    expect(result.items[0]?.skuSummary).toBeUndefined()
  })

  it("normalizes the localized fields of every row", async () => {
    collaborators.page.mockResolvedValue({ rows: [productRow({ titles: { "pl-PL": "Bransoletka Aurora" } })], total: 1 })

    const result = await getAdminProductsPage({ data: {} })

    expect(result.items[0]?.titles).toStrictEqual({ "en-US": "", "pl-PL": "Bransoletka Aurora" })
  })
})

describe("getAdminProductsPageQuery", () => {
  it("keys the cache entry by the full input so two filters do not collide", () => {
    const input = { page: 2, status: "published" } as const
    const options = getAdminProductsPageQuery(input)

    expect(options.queryKey).toStrictEqual([...PRODUCT_QUERY_KEYS.ADMIN.PAGE, input])
    expect(options.staleTime).toBe(PRODUCT_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})

it("loads the requested product page through its cache query", async () => {
  await expect(new QueryClient().query(getAdminProductsPageQuery({ page: 2, pageSize: 10 }))).resolves.toMatchObject({ total: 0 })
  expect(collaborators.page).toHaveBeenCalledWith(expect.objectContaining({ limit: 10, offset: 10 }))
})
