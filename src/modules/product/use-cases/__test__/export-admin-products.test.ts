import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const collaborators = vi.hoisted(() => ({
  aggregates: vi.fn(),
  filterParams: vi.fn(),
  list: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn() }))
vi.mock("~/src/modules/product/product.accessors", () => ({ getAdminProductsFilteredList: collaborators.list }))
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

import { exportAdminProducts } from "~/src/modules/product/use-cases/export-admin-products"

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
  collaborators.list.mockResolvedValue([])
  collaborators.aggregates.mockResolvedValue(EMPTY_AGGREGATES)
})

describe("exportAdminProducts selection", () => {
  it("asks for every row the shared filter builder describes, with no page window", async () => {
    collaborators.filterParams.mockReturnValue({ search: "aurora", status: "published" })

    await exportAdminProducts({ data: { search: "aurora", status: "published" } })

    expect(collaborators.filterParams).toHaveBeenCalledWith({ search: "aurora", status: "published" })
    expect(collaborators.list).toHaveBeenCalledExactlyOnceWith({ search: "aurora", status: "published" })
  })

  it("exports nothing when the filters match no product", async () => {
    await expect(exportAdminProducts({ data: {} })).resolves.toStrictEqual([])
  })

  it("passes a sort order straight through to the filter builder", async () => {
    await exportAdminProducts({ data: { sort: { columnId: "handle", desc: true } } })

    expect(collaborators.filterParams).toHaveBeenCalledWith({ sort: { columnId: "handle", desc: true } })
  })
})

describe("exportAdminProducts rows", () => {
  it("loads the aggregates only for the rows it is about to export", async () => {
    const rows = [productRow()]
    collaborators.list.mockResolvedValue(rows)

    await exportAdminProducts({ data: {} })

    expect(collaborators.aggregates).toHaveBeenCalledExactlyOnceWith(rows)
  })

  it("folds the variant statistics into every exported row", async () => {
    collaborators.list.mockResolvedValue([productRow()])
    collaborators.aggregates.mockResolvedValue({
      skuSummaryByProductId: new Map([["product-1", "SKU-1, SKU-2"]]),
      statsByProductId: new Map([["product-1", { minPrice: 24_900, totalStock: 6, variantCount: 2 }]]),
    })

    const result = await exportAdminProducts({ data: {} })

    expect(result[0]).toMatchObject({
      handle: "bransoletka-aurora",
      minPrice: 24_900,
      skuSummary: "SKU-1, SKU-2",
      totalStock: 6,
      variantCount: 2,
    })
  })

  it("treats a product without statistics as having no stock and no variants", async () => {
    collaborators.list.mockResolvedValue([productRow()])

    const result = await exportAdminProducts({ data: {} })

    expect(result[0]).toMatchObject({ minPrice: undefined, totalStock: 0, variantCount: 0 })
    expect(result[0]?.skuSummary).toBeUndefined()
  })

  it("normalizes the localized titles of every exported row", async () => {
    collaborators.list.mockResolvedValue([productRow({ titles: { "pl-PL": "Bransoletka Aurora" } })])

    const result = await exportAdminProducts({ data: {} })

    expect(result[0]?.titles).toStrictEqual({ "en-US": "", "pl-PL": "Bransoletka Aurora" })
  })

  it("keeps the order the accessor returned the rows in", async () => {
    collaborators.list.mockResolvedValue([productRow(), productRow({ handle: "kolczyki-luna", id: "product-2" })])

    const result = await exportAdminProducts({ data: {} })

    expect(result.map((row) => row.id)).toStrictEqual(["product-1", "product-2"])
  })
})
