import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { APP_NAME } from "~/src/presentation/branding/app"

const collections = vi.hoisted(() => ({ fetch: vi.fn<() => Promise<readonly { id: string }[]>>() }))

interface PageMetaTags {
  readonly meta: readonly Readonly<{ content?: string; name?: string; title?: string }>[]
}

interface RouteDefinition {
  readonly head?: (ctx: Readonly<{ loaderData?: Readonly<{ description: string; title: string }> | undefined }>) => PageMetaTags
  readonly loader?: (
    ctx: Readonly<{ context: { locale: SupportedLocale; queryClient: QueryClient } }>,
  ) => Promise<{ description: string; title: string }>
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
vi.mock("~/src/modules/product-collection/use-cases/get-collections", () => ({
  getCollectionsQuery: () => ({ queryFn: () => collections.fetch(), queryKey: ["collections", "storefront"] }),
}))
vi.mock("~/src/presentation/components/custom/pages/collections/collection-card", () => ({ CollectionCard: () => null }))

await import("~/src/routes/_storefront.collections.index")

const route = captured.current

if (route?.head === undefined || route.loader === undefined) {
  throw new Error("the storefront collections route registered no head or loader")
}

const titleOf = (tags: PageMetaTags) => tags.meta.find((tag) => tag.title !== undefined)?.title

const descriptionOf = (tags: PageMetaTags) => tags.meta.find((tag) => tag.name === "description")?.content

beforeEach(() => {
  vi.clearAllMocks()
  collections.fetch.mockResolvedValue([{ id: "collection-1" }])
})

describe("storefront collections head", () => {
  it("falls back to the shop name alone before the loader has run", () => {
    const tags = route.head?.({ loaderData: undefined })

    expect(tags === undefined ? undefined : titleOf(tags)).toBe(APP_NAME)
    expect(tags === undefined ? undefined : descriptionOf(tags)).toBe("")
  })

  it("puts the page title in front of the shop name once the loader has run", () => {
    const tags = route.head?.({ loaderData: { description: "Discover our curated collections.", title: "Collections" } })

    expect(tags === undefined ? undefined : titleOf(tags)).toBe(`Collections | ${APP_NAME}`)
    expect(tags === undefined ? undefined : descriptionOf(tags)).toBe("Discover our curated collections.")
  })
})

describe("storefront collections loader", () => {
  it("returns the page title and description from the message catalogue", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await expect(route.loader?.({ context: { locale: "en-US", queryClient } })).resolves.toStrictEqual({
      description: "Discover our curated collections.",
      title: "Collections",
    })
  })

  it("warms the collection list so the page can render without a second request", async () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    await route.loader?.({ context: { locale: "en-US", queryClient } })

    expect(collections.fetch).toHaveBeenCalledTimes(1)
    expect(queryClient.getQueryData(["collections", "storefront"])).toStrictEqual([{ id: "collection-1" }])
  })
})
