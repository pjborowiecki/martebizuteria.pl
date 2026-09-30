import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const queries = vi.hoisted(() => ({
  collections: vi.fn<() => Promise<readonly { id: string }[]>>(),
  stats: vi.fn<() => Promise<{ active: number; avgProducts: number; draft: number; total: number }>>(),
}))

interface RouteDefinition {
  readonly loader?: (ctx: Readonly<{ context: { queryClient: QueryClient } }>) => Promise<void>
}

const captured: { current: RouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: RouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/modules/product-collection/use-cases/get-admin-collections", () => ({
  getAdminCollectionsQuery: () => ({ queryFn: () => queries.collections(), queryKey: ["admin", "collections", "list"] }),
}))
vi.mock("~/src/modules/product-collection/use-cases/get-collection-stats", () => ({
  getCollectionStatsQuery: () => ({ queryFn: () => queries.stats(), queryKey: ["admin", "collections", "stats"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-table", () => ({
  CollectionsTableContent: () => null,
}))

await import("~/src/routes/admin.catalog.collections.index")

const route = captured.current

if (route?.loader === undefined) {
  throw new Error("the admin collections index route registered no loader")
}

const runLoader = (queryClient: QueryClient) => route.loader?.({ context: { queryClient } })

beforeEach(() => {
  vi.clearAllMocks()
  queries.collections.mockResolvedValue([{ id: "collection-1" }])
  queries.stats.mockResolvedValue({ active: 1, avgProducts: 2, draft: 0, total: 1 })
})

describe("admin collections index loader", () => {
  it("warms both the collection list and the stat cards before the table renders", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await runLoader(queryClient)

    expect(queryClient.getQueryData(["admin", "collections", "list"])).toStrictEqual([{ id: "collection-1" }])
    expect(queryClient.getQueryData(["admin", "collections", "stats"])).toStrictEqual({
      active: 1,
      avgProducts: 2,
      draft: 0,
      total: 1,
    })
  })

  it("serves both warmed queries from the cache on a second visit", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await runLoader(queryClient)
    await runLoader(queryClient)

    expect(queries.collections).toHaveBeenCalledTimes(1)
    expect(queries.stats).toHaveBeenCalledTimes(1)
  })

  it("fails the navigation when the collection list cannot be read", async () => {
    queries.collections.mockRejectedValue(new Error("collections unavailable"))

    await expect(runLoader(new QueryClient({ defaultOptions: { queries: { retry: false } } }))).rejects.toThrow("collections unavailable")
  })
})
