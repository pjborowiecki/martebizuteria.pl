import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { execute } = vi.hoisted(() => ({ execute: vi.fn<(input: { handle: string }) => Promise<unknown>>() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/product/product.accessors", () => ({ getProductByHandleQuery: { execute } }))
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

import { PRODUCT_QUERY_KEYS, PRODUCT_QUERY_STALE_MS } from "~/src/modules/product/product.constants"
import { getAdminProduct, getAdminProductQuery } from "~/src/modules/product/use-cases/get-admin-product"

const productRow = { handle: "bransoletka-aurora", id: "product-1" }

beforeEach(() => {
  vi.clearAllMocks()
  execute.mockResolvedValue(productRow)
})

describe("getAdminProduct", () => {
  it("looks the product up by the handle it was given", async () => {
    await getAdminProduct({ data: "bransoletka-aurora" })

    expect(execute).toHaveBeenCalledWith({ handle: "bransoletka-aurora" })
  })

  it("returns the row the prepared query found", async () => {
    await expect(getAdminProduct({ data: "bransoletka-aurora" })).resolves.toStrictEqual(productRow)
  })

  it("returns nothing for a handle no product uses", async () => {
    execute.mockResolvedValue(undefined)

    await expect(getAdminProduct({ data: "unknown-handle" })).resolves.toBeUndefined()
  })

  it("rejects an empty handle before querying", async () => {
    await expect(getAdminProduct({ data: "" })).rejects.toThrow()

    expect(execute).not.toHaveBeenCalled()
  })
})

describe("getAdminProductQuery", () => {
  it("keys the cache entry by the handle", () => {
    expect(getAdminProductQuery("bransoletka-aurora").queryKey).toStrictEqual([...PRODUCT_QUERY_KEYS.ADMIN.BY_HANDLE, "bransoletka-aurora"])
  })

  it("keeps the admin row fresh for the catalog stale window and refetches on mount", () => {
    const options = getAdminProductQuery("bransoletka-aurora")

    expect(options.staleTime).toBe(PRODUCT_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(true)
    expect(options.refetchOnWindowFocus).toBe(false)
  })

  it("stays disabled while the editor has no handle yet", () => {
    expect(getAdminProductQuery("").enabled).toBe(false)
  })

  it("stays disabled while the editor is creating a product", () => {
    expect(getAdminProductQuery("new").enabled).toBe(false)
  })

  it("is enabled for a stored product handle", () => {
    expect(getAdminProductQuery("bransoletka-aurora").enabled).toBe(true)
  })

  it("fetches the product through the server function", async () => {
    await getAdminProductQuery("bransoletka-aurora").queryFn?.({
      client: new QueryClient(),
      meta: undefined,
      queryKey: [...PRODUCT_QUERY_KEYS.ADMIN.BY_HANDLE, "bransoletka-aurora"],
      signal: new AbortController().signal,
    })

    expect(execute).toHaveBeenCalledWith({ handle: "bransoletka-aurora" })
  })
})

it("reports missing products as router not-found errors when fetching the admin cache", async () => {
  execute.mockResolvedValue(undefined)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  await expect(client.query(getAdminProductQuery("removed-product"))).rejects.toMatchObject({ isNotFound: true })
  expect(execute).toHaveBeenCalledWith({ handle: "removed-product" })
})
