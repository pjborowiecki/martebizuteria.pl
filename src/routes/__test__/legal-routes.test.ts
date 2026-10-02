import { isValidElement } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import type * as ReactStart from "@tanstack/react-start"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { CONTENT_PAGE_HANDLE } from "~/src/modules/content-page/content-page.constants"
import { getContentPageQuery } from "~/src/modules/content-page/use-cases/get-content-page"

interface ContentRouteDefinition {
  readonly component?: () => unknown
  readonly head?: unknown
  readonly loader?: (ctx: { context: { locale: string; queryClient: QueryClient } }) => Promise<PageMeta>
}

const captured = vi.hoisted(() => ({ routes: [] as ContentRouteDefinition[] }))

const remote = vi.hoisted(() => ({ getContentPage: vi.fn<(handle: string, locale: string) => Promise<unknown>>() }))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    createFileRoute: () => (options: ContentRouteDefinition) => {
      captured.routes.push(options)

      return options
    },
  }
})
vi.mock("@tanstack/react-start", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactStart>()

  return {
    ...actual,
    createServerFn: () => {
      const builder = {
        handler: () => (options: { readonly data: { readonly handle: string; readonly locale: string } }) =>
          remote.getContentPage(options.data.handle, options.data.locale),
        middleware: () => builder,
        validator: () => builder,
      }

      return builder
    },
  }
})
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ withRequest: {} }))
vi.mock("~/src/modules/content-page/content-page.accessors", () => ({ findContentPageByHandle: vi.fn() }))
vi.mock("~/src/presentation/components/custom/pages/content-page/content-page-article", () => ({
  ContentPageArticle: () => {},
}))

import { type PageMeta, pageHead } from "~/src/lib/seo"

await import("~/src/routes/_storefront.privacy-policy")
await import("~/src/routes/_storefront.exchanges-and-returns")

const [privacyRoute, exchangesRoute] = captured.routes

if (privacyRoute === undefined || exchangesRoute === undefined) {
  throw new Error("the content page routes did not register their options")
}

const PAGES = [
  { handle: CONTENT_PAGE_HANDLE.PRIVACY_POLICY, route: privacyRoute },
  { handle: CONTENT_PAGE_HANDLE.EXCHANGES_AND_RETURNS, route: exchangesRoute },
] as const

beforeEach(() => {
  vi.clearAllMocks()
})

describe("the content page routes", () => {
  it.each(PAGES)("renders the $handle page through the shared article", ({ handle, route }) => {
    const element = route.component?.()

    expect(isValidElement(element)).toBe(true)
    expect(isValidElement(element) ? element.props : undefined).toStrictEqual({ handle })
  })

  it.each(PAGES)("registers the shared page head builder for $handle", ({ route }) => {
    expect(route.head).toBe(pageHead)
  })

  it.each(PAGES)("loads the $handle page in the request locale and heads the document with it", async ({ handle, route }) => {
    remote.getContentPage.mockResolvedValue({ body: "## Body", description: "What we do.", revisedAt: new Date(0), title: "A page" })
    const queryClient = new QueryClient()

    await expect(route.loader?.({ context: { locale: "en-US", queryClient } })).resolves.toStrictEqual({
      description: "What we do.",
      title: "A page",
    })
    expect(remote.getContentPage).toHaveBeenCalledWith(handle, "en-US")
    expect(queryClient.getQueryData(getContentPageQuery(handle, "en-US").queryKey)).toMatchObject({ title: "A page" })
  })
})
