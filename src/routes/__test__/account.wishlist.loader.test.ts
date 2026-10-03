import type * as ReactRouter from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

interface QueryRequest {
  readonly queryKey: readonly unknown[]
  readonly staleTime: unknown
}

interface WishlistRouteDefinition {
  readonly loader?: (
    args: Readonly<{ context: { locale: string; queryClient: { query: (options: QueryRequest) => Promise<unknown> } } }>,
  ) => Promise<unknown>
}

const captured: { current: WishlistRouteDefinition | undefined } = { current: undefined }

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: WishlistRouteDefinition) => {
      captured.current = options

      return options
    },
  }
})
vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => path,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock("~/src/modules/wishlist/use-cases/toggle-wishlist-item", () => ({ toggleWishlistItemMutation: { mutationFn: vi.fn() } }))
vi.mock("~/src/modules/wishlist/use-cases/list-wishlist-items", async () => {
  const { WISHLIST_QUERY_KEYS } = await import("~/src/modules/wishlist/wishlist.constants")

  return {
    listWishlistItemsQuery: (locale: string) => ({ queryFn: () => Promise.resolve([]), queryKey: [...WISHLIST_QUERY_KEYS.ITEMS, locale] }),
  }
})

import { WISHLIST_QUERY_KEYS } from "~/src/modules/wishlist/wishlist.constants"

await import("~/src/routes/account.wishlist")

const route = captured.current

if (route?.loader === undefined) {
  throw new Error("the wishlist route registered no loader")
}

const { loader } = route

const query = vi.fn<(options: QueryRequest) => Promise<unknown>>()

const isMessagesRequest = (options: QueryRequest): boolean => options.queryKey[0] === "messages"

const load = (locale: string) => loader({ context: { locale, queryClient: { query } } })

beforeEach(() => {
  query
    .mockReset()
    .mockImplementation((options) =>
      Promise.resolve(
        options.queryKey[2] === "pages.account" ? { sidebar: { wishlist: "Ulubione" } } : { description: "Twoje konto", title: "Konto" },
      ),
    )
})

describe("the wishlist route loader", () => {
  it("warms the saved products in the visitor's language and treats them as already fresh", async () => {
    await load("pl-PL")

    const pageQueries = query.mock.calls.map(([options]) => options).filter((options) => !isMessagesRequest(options))

    expect(pageQueries).toStrictEqual([expect.objectContaining({ queryKey: [...WISHLIST_QUERY_KEYS.ITEMS, "pl-PL"], staleTime: "static" })])
  })

  it("titles the page after the wishlist section", async () => {
    await expect(load("pl-PL")).resolves.toStrictEqual({ description: "Twoje konto", title: "Ulubione | M'Arte" })
  })

  it("lets a failed wishlist read reach the route error boundary", async () => {
    const failure = new Error("D1 unavailable")
    query.mockRejectedValueOnce(failure)

    await expect(load("en-US")).rejects.toBe(failure)
  })
})
