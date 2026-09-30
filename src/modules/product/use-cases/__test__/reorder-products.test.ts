import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { scheduleProductCatalogInvalidation, setProductRanks } = vi.hoisted(() => ({
  scheduleProductCatalogInvalidation: vi.fn<() => void>(),
  setProductRanks: vi.fn<(updates: readonly { id: string; rank: number }[]) => Promise<void>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({ scheduleProductCatalogInvalidation }))
vi.mock("~/src/modules/product/product.mutations", () => ({ setProductRanks }))
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

import { PRODUCT_MUTATION_KEYS } from "~/src/modules/product/product.constants"
import { reorderProducts, reorderProductsMutation } from "~/src/modules/product/use-cases/reorder-products"

const FIRST_ID = "0195b6f4-0000-7000-8000-000000000001"

const SECOND_ID = "0195b6f4-0000-7000-8000-000000000002"

beforeEach(() => {
  setProductRanks.mockReset()
  setProductRanks.mockResolvedValue()
  scheduleProductCatalogInvalidation.mockReset()
})

describe("reorderProducts", () => {
  it("ranks the products by their position in the submitted order", async () => {
    await reorderProducts({ data: [SECOND_ID, FIRST_ID] })

    expect(setProductRanks).toHaveBeenCalledWith([
      { id: SECOND_ID, rank: 0 },
      { id: FIRST_ID, rank: 1 },
    ])
  })

  it("reports success to the caller", async () => {
    await expect(reorderProducts({ data: [FIRST_ID] })).resolves.toStrictEqual({ ok: true })
  })

  it("schedules the storefront catalog invalidation after the ranks are stored", async () => {
    const order: string[] = []
    setProductRanks.mockImplementation(() => {
      order.push("ranks")

      return Promise.resolve()
    })
    scheduleProductCatalogInvalidation.mockImplementation(() => {
      order.push("invalidation")
    })

    await reorderProducts({ data: [FIRST_ID] })

    expect(order).toStrictEqual(["ranks", "invalidation"])
  })

  it("refuses an empty ordering", async () => {
    await expect(reorderProducts({ data: [] })).rejects.toThrow()
    expect(setProductRanks).not.toHaveBeenCalled()
  })

  it("refuses a blank product id", async () => {
    await expect(reorderProducts({ data: [""] })).rejects.toThrow()
    expect(setProductRanks).not.toHaveBeenCalled()
  })
})

describe("reorderProductsMutation", () => {
  it("is keyed by the shared reorder mutation key", () => {
    expect(reorderProductsMutation.mutationKey).toStrictEqual(PRODUCT_MUTATION_KEYS.REORDER)
  })

  it("passes the ordering straight through to the server function", async () => {
    await new MutationObserver(new QueryClient(), reorderProductsMutation).mutate([FIRST_ID, SECOND_ID])

    expect(setProductRanks).toHaveBeenCalledWith([
      { id: FIRST_ID, rank: 0 },
      { id: SECOND_ID, rank: 1 },
    ])
  })
})
