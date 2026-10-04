import { type JSX } from "react"

import { QueryClient } from "@tanstack/react-query"
import type * as ReactRouter from "@tanstack/react-router"
import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { type DocsNavigationSection } from "~/src/integrations/fumadocs/fumadocs.docs"

interface DocsPageMeta {
  readonly description: string
  readonly path: string
  readonly title: string
}

interface DocsLoaderContext {
  readonly context: { readonly queryClient: QueryClient }
  readonly params: { readonly _splat?: string }
}

interface DocsRouteDefinition {
  readonly component?: () => JSX.Element
  readonly head?: unknown
  readonly loader?: (context: DocsLoaderContext) => Promise<DocsLoaderData>
  readonly staticData?: { readonly namespaces?: readonly string[] }
  readonly wrapInSuspense?: boolean
}

type DocsLoaderData = DocsPageMeta | { readonly sections: readonly DocsNavigationSection[] }

interface DocsRouting {
  readonly captured: Map<string, DocsRouteDefinition>
  readonly loaderData: { current: DocsLoaderData }
}

const routing = vi.hoisted((): DocsRouting => ({
  captured: new Map(),
  loaderData: { current: { sections: [] } },
}))

const menu = vi.hoisted(() => ({ fetchCollections: vi.fn<() => Promise<unknown[]>>() }))

const docs = vi.hoisted(() => ({
  loadDocsNavigation: vi.fn<() => Promise<{ readonly sections: readonly DocsNavigationSection[] }>>(),
  loadDocsPage: vi.fn<(splat?: string) => Promise<DocsPageMeta>>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>()

  return {
    ...actual,
    Outlet: (): JSX.Element => <section data-testid="outlet" />,
    createFileRoute: (path: string) => (options: DocsRouteDefinition) => {
      routing.captured.set(path, options)

      return { options, useLoaderData: () => routing.loaderData.current }
    },
  }
})
vi.mock("~/src/integrations/fumadocs/fumadocs.docs", () => docs)
vi.mock("~/src/modules/product-collection/use-cases/get-collections", async () => {
  const { COLLECTION_QUERY_KEYS } = await import("~/src/modules/product-collection/product-collection.constants")

  return { getCollectionsQuery: () => ({ queryFn: menu.fetchCollections, queryKey: COLLECTION_QUERY_KEYS.ALL }) }
})
vi.mock("~/src/presentation/components/custom/pages/docs/docs-sidebar", () => ({
  DocsSidebar: (): JSX.Element => <nav data-testid="docs-sidebar" />,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation", () => ({
  Navigation: (): JSX.Element => <header data-testid="storefront-navigation" />,
}))
vi.mock("~/src/presentation/components/custom/pages/landing-page/footer/footer", () => ({
  Footer: (): JSX.Element => <footer data-testid="storefront-footer" />,
}))
vi.mock("~/src/presentation/components/custom/docs-content", () => ({
  docsContent: { useContent: (path: string): JSX.Element => <article data-testid="docs-content">{path}</article> },
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"

import { pageHead } from "~/src/lib/seo"

await import("~/src/routes/docs")
await import("~/src/routes/docs.index")
await import("~/src/routes/docs.$")

const SECTIONS: readonly DocsNavigationSection[] = [{ links: [{ splat: "project/about", title: "About" }], title: "Project" }]

const PAGE_META: DocsPageMeta = { description: "", path: "index.en-US.mdx", title: "Documentation" }

const MENU_COLLECTIONS = [{ handle: "nowosci", id: "collection-1", image: "collections/arrivals.webp" }]

const routeAt = (path: string): DocsRouteDefinition => {
  const options = routing.captured.get(path)
  if (options === undefined) {
    throw new Error(`no route registered at ${path}`)
  }

  return options
}

const loadAt = (path: string, params: DocsLoaderContext["params"] = {}, queryClient = new QueryClient()): Promise<DocsLoaderData> => {
  const { loader } = routeAt(path)
  if (loader === undefined) {
    throw new Error(`the route at ${path} registered no loader`)
  }
  menu.fetchCollections.mockResolvedValue(MENU_COLLECTIONS)

  return loader({ context: { queryClient }, params })
}

const renderRoute = (path: string, loaderData: DocsLoaderData) => {
  const { component: Component } = routeAt(path)
  if (Component === undefined) {
    throw new Error(`the route at ${path} registered no component`)
  }
  routing.loaderData.current = loaderData

  return renderWithProviders(<Component />)
}

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe("documentation layout", () => {
  it("keeps the storefront navigation and footer around the documentation area", () => {
    renderRoute("/docs", { sections: SECTIONS })

    expect(screen.getByTestId("storefront-navigation")).toBeInTheDocument()
    expect(screen.getByTestId("storefront-footer")).toBeInTheDocument()
  })

  it("renders the sidebar beside the routed page", () => {
    renderRoute("/docs", { sections: SECTIONS })

    expect(screen.getByTestId("docs-sidebar")).toBeInTheDocument()
    expect(screen.getByTestId("outlet")).toBeInTheDocument()
    expect(screen.getByRole("main")).toBeInTheDocument()
  })

  it("loads the page tree and preloads only the documentation namespace", () => {
    const route = routeAt("/docs")

    expect(route.loader).toBeTypeOf("function")
    expect(route.staticData).toStrictEqual({ namespaces: ["pages.docs"] })
  })

  it("hands the sidebar the sections of the documentation tree", async () => {
    docs.loadDocsNavigation.mockResolvedValue({ sections: SECTIONS })

    await expect(loadAt("/docs")).resolves.toStrictEqual({ sections: SECTIONS })
  })

  it("loads the collections the full-screen menu shows together with the page tree", async () => {
    docs.loadDocsNavigation.mockResolvedValue({ sections: SECTIONS })
    const queryClient = new QueryClient()

    await loadAt("/docs", {}, queryClient)

    expect(queryClient.getQueryData(COLLECTION_QUERY_KEYS.ALL)).toStrictEqual(MENU_COLLECTIONS)
  })

  it("still hands the sidebar its sections when the menu collections cannot be loaded", async () => {
    docs.loadDocsNavigation.mockResolvedValue({ sections: SECTIONS })
    menu.fetchCollections.mockRejectedValueOnce(new Error("D1 unavailable"))
    const queryClient = new QueryClient()

    await expect(loadAt("/docs", {}, queryClient)).resolves.toStrictEqual({ sections: SECTIONS })
    expect(queryClient.getQueryState(COLLECTION_QUERY_KEYS.ALL)).toMatchObject({ data: undefined, status: "error" })
  })
})

describe("documentation page loaders", () => {
  it("loads the documentation root for the index route", async () => {
    docs.loadDocsPage.mockResolvedValue(PAGE_META)

    await expect(loadAt("/docs/")).resolves.toStrictEqual(PAGE_META)
    expect(docs.loadDocsPage).toHaveBeenCalledExactlyOnceWith()
  })

  it("loads the page the splat names, with the title and description its head needs", async () => {
    const theme: DocsPageMeta = { description: "Colour and type tokens", path: "ui/theme.en-US.mdx", title: "Theme" }
    docs.loadDocsPage.mockResolvedValue(theme)

    await expect(loadAt("/docs/$", { _splat: "ui/theme" })).resolves.toStrictEqual(theme)
    expect(docs.loadDocsPage).toHaveBeenCalledExactlyOnceWith("ui/theme")
  })

  it("lets a missing page reject the load so the router can show not found", async () => {
    docs.loadDocsPage.mockRejectedValue({ isNotFound: true })

    await expect(loadAt("/docs/$", { _splat: "nowhere" })).rejects.toStrictEqual({ isNotFound: true })
  })
})

describe.each(["/docs/", "/docs/$"])("the documentation route at %s", (path) => {
  it("renders the page the loader resolved", () => {
    renderRoute(path, PAGE_META)

    expect(screen.getByTestId("docs-content")).toHaveTextContent(PAGE_META.path)
  })

  it("builds its document head with the shared page head helper", () => {
    expect(routeAt(path).head).toBe(pageHead)
  })

  it("loads its page outside a suspense boundary", () => {
    expect(routeAt(path).loader).toBeTypeOf("function")
    expect(routeAt(path).wrapInSuspense).toBe(false)
  })
})
