import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { COLLECTION_MUTATION_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { reorderCollections, reorderCollectionsMutation } from "~/src/modules/product-collection/use-cases/reorder-collections"

const operations = vi.hoisted(() => ({
  invalidate: vi.fn(),
  setRanks: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: vi.fn() }))
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleCollectionCatalogInvalidation: operations.invalidate,
}))
vi.mock("~/src/modules/product-collection/product-collection.server", () => ({
  setCollectionRanks: operations.setRanks,
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

const FIRST = "0195f0c0-0000-7000-8000-000000000001"

const SECOND = "0195f0c0-0000-7000-8000-000000000002"

const THIRD = "0195f0c0-0000-7000-8000-000000000003"

describe("reorderCollections", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    operations.setRanks.mockResolvedValue(undefined)
  })

  it("ranks the ids by their position, starting at zero", async () => {
    await reorderCollections({ data: [THIRD, FIRST, SECOND] })

    expect(operations.setRanks).toHaveBeenCalledExactlyOnceWith([
      { id: THIRD, rank: 0 },
      { id: FIRST, rank: 1 },
      { id: SECOND, rank: 2 },
    ])
  })

  it("confirms the reorder", async () => {
    await expect(reorderCollections({ data: [FIRST] })).resolves.toStrictEqual({ ok: true })
  })

  it("invalidates the storefront once the ranks are stored", async () => {
    await reorderCollections({ data: [FIRST] })

    expect(operations.invalidate).toHaveBeenCalledOnce()
  })

  it("does not invalidate when storing the ranks fails", async () => {
    operations.setRanks.mockRejectedValue(new Error("write failed"))

    await expect(reorderCollections({ data: [FIRST] })).rejects.toThrow("write failed")
    expect(operations.invalidate).not.toHaveBeenCalled()
  })

  it("rejects an empty order", async () => {
    await expect(reorderCollections({ data: [] })).rejects.toThrow()
    expect(operations.setRanks).not.toHaveBeenCalled()
  })

  it("rejects an id that is not a uuid", async () => {
    await expect(reorderCollections({ data: ["first"] })).rejects.toThrow()
    expect(operations.setRanks).not.toHaveBeenCalled()
  })
})

describe("reorderCollectionsMutation", () => {
  it("is keyed so the admin list can track it", () => {
    expect(reorderCollectionsMutation.mutationKey).toStrictEqual(COLLECTION_MUTATION_KEYS.REORDER)
  })

  it("forwards the submitted order to the server function", async () => {
    await reorderCollectionsMutation.mutationFn?.([SECOND, FIRST], { client: new QueryClient(), meta: undefined })

    expect(operations.setRanks).toHaveBeenCalledWith([
      { id: SECOND, rank: 0 },
      { id: FIRST, rank: 1 },
    ])
  })
})
