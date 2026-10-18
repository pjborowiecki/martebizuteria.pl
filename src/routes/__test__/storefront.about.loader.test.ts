import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { describe, expect, it, vi } from "vite-plus/test"

import { type ContentPage } from "~/src/modules/content-page/content-page.types"

import { pageHead } from "~/src/lib/seo"

interface LoaderContext {
  readonly context: {
    readonly locale: string
    readonly queryClient: QueryClient
  }
}

interface AboutRouteDefinition {
  readonly head?: unknown
  readonly loader?: (context: LoaderContext) => Promise<{ readonly description: string; readonly title: string }>
}

const remote = vi.hoisted(() => ({ getContentPage: vi.fn<(handle: string, locale: string) => Promise<ContentPage["view"]>>() }))

const captured: { current: AboutRouteDefinition | undefined } = { current: undefined }

vi.mock("~/src/modules/store-setting/use-cases/get-seller-details", async () => {
  const { SELLER_DETAILS_QUERIES } = await import("~/src/platform/testing/mocks/seller-details")

  return SELLER_DETAILS_QUERIES
})
vi.mock("~/src/modules/content-page/use-cases/get-content-page", () => ({
  getContentPageQuery: (handle: string, locale: string) => ({
    queryFn: () => remote.getContentPage(handle, locale),
    queryKey: ["content-page", handle, locale],
  }),
}))
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: AboutRouteDefinition) => {
      captured.current = options

      return { options }
    },
  }
})

await import("~/src/routes/_storefront.about")

const route = captured.current

if (route === undefined) {
  throw new Error("the about route did not register any options")
}

const PAGE: ContentPage["view"] = {
  body: "Tworzymy srebrne i złote formy.",
  description: "M'ARTE to biżuteria tworzona w Bochni.",
  revisedAt: new Date("2026-10-18T10:00:00.000Z"),
  title: "O M'Arte",
}

describe("storefront about loader", () => {
  it("loads the About page in the locale the router resolved and heads the document with its title and description", async () => {
    remote.getContentPage.mockResolvedValue(PAGE)
    const queryClient = new QueryClient()

    await expect(route.loader?.({ context: { locale: "pl-PL", queryClient } })).resolves.toStrictEqual({
      description: "M'ARTE to biżuteria tworzona w Bochni.",
      title: "O M'Arte",
    })
    expect(remote.getContentPage).toHaveBeenCalledExactlyOnceWith("about", "pl-PL")
    expect(queryClient.getQueryData(["content-page", "about", "pl-PL"])).toStrictEqual(PAGE)
  })
})

describe("storefront about head metadata", () => {
  it("registers the shared page head builder", () => {
    expect(route.head).toBe(pageHead)
  })
})
