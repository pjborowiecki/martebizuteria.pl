import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const server = vi.hoisted(() => ({
  getAdminProductAttributeListItems: vi.fn<() => Promise<readonly unknown[]>>(),
  setProductAttributeRanks: vi.fn<(updates: readonly { id: string; rank: number }[]) => Promise<void>>(),
}))

const invalidation = vi.hoisted(() => ({ schedule: vi.fn() }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleProductAttributeCatalogInvalidation: invalidation.schedule,
}))
vi.mock("~/src/modules/product-attribute/product-attribute.server", () => ({
  getAdminProductAttributeListItems: server.getAdminProductAttributeListItems,
  setProductAttributeRanks: server.setProductAttributeRanks,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler:
        (handler: (options: { data: unknown }) => unknown) =>
        (options?: { data?: unknown }): unknown =>
          handler({ data: builder.validate(options?.data) }),
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

import { PRODUCT_ATTRIBUTE_QUERY_KEYS, PRODUCT_ATTRIBUTE_QUERY_STALE_MS } from "~/src/modules/product-attribute/product-attribute.constants"
import { getAdminProductAttributesQuery } from "~/src/modules/product-attribute/use-cases/get-admin-product-attributes"
import {
  reorderProductAttributes,
  reorderProductAttributesMutation,
} from "~/src/modules/product-attribute/use-cases/reorder-product-attributes"

const mutationContext = () => ({ client: new QueryClient(), meta: undefined, signal: AbortSignal.abort() })

beforeEach(() => {
  vi.clearAllMocks()
  server.getAdminProductAttributeListItems.mockResolvedValue([])
  server.setProductAttributeRanks.mockResolvedValue(undefined)
})

describe("getAdminProductAttributesQuery cache policy", () => {
  it("keys the admin list under the shared admin key", () => {
    expect(getAdminProductAttributesQuery().queryKey).toStrictEqual(PRODUCT_ATTRIBUTE_QUERY_KEYS.ADMIN.ALL)
  })

  it("keeps the list fresh for the configured window and never refetches on mount or focus", () => {
    const options = getAdminProductAttributesQuery()

    expect(options.staleTime).toBe(PRODUCT_ATTRIBUTE_QUERY_STALE_MS)
    expect(options.refetchOnMount).toBe(false)
    expect(options.refetchOnWindowFocus).toBe(false)
  })
})

describe("reorderProductAttributesMutation", () => {
  it("sends the ordered ids through the server function", async () => {
    await reorderProductAttributesMutation.mutationFn?.(["b", "a"], mutationContext())

    expect(server.setProductAttributeRanks).toHaveBeenCalledWith([
      { id: "b", rank: 0 },
      { id: "a", rank: 1 },
    ])
  })

  it("invalidates the catalog caches once the ranks are written", async () => {
    await reorderProductAttributesMutation.mutationFn?.(["a"], mutationContext())

    expect(invalidation.schedule).toHaveBeenCalledTimes(1)
  })

  it("refuses an empty order", async () => {
    await expect(Promise.resolve().then(() => reorderProductAttributes({ data: [] }))).rejects.toThrow()
    expect(server.setProductAttributeRanks).not.toHaveBeenCalled()
  })

  it("leaves a single attribute at rank zero", async () => {
    await reorderProductAttributes({ data: ["only"] })

    expect(server.setProductAttributeRanks).toHaveBeenCalledWith([{ id: "only", rank: 0 }])
  })
})

it("loads the admin attribute rows through the cache query", async () => {
  const rows = [{ id: "material", productCount: 3 }]
  server.getAdminProductAttributeListItems.mockResolvedValue(rows)
  await expect(new QueryClient().query(getAdminProductAttributesQuery())).resolves.toStrictEqual(rows)
  expect(server.getAdminProductAttributeListItems).toHaveBeenCalledOnce()
})
