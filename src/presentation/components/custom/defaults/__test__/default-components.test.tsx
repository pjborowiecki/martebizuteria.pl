import { renderToString } from "react-dom/server"

import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { currentRequest } = vi.hoisted(() => ({
  currentRequest: vi.fn<() => Request>(() => new Request("https://store.test/")),
}))

vi.mock("@tanstack/react-start/server", () => ({ getRequest: currentRequest }))

import { DefaultErrorComponent } from "~/src/presentation/components/custom/defaults/default-error-component"
import { DefaultNotFoundComponent } from "~/src/presentation/components/custom/defaults/default-not-found-component"
import { DefaultPendingComponent } from "~/src/presentation/components/custom/defaults/default-pending-component"

describe("route fallbacks without translation queries", () => {
  beforeEach(() => {
    currentRequest.mockReturnValue(new Request("https://store.test/"))
  })

  it.each([
    { locale: "en-US", message: "Something went wrong", pathname: "/en-US/about" },
    { locale: "pl-PL", message: "Coś poszło nie tak", pathname: "/about" },
  ])("renders the $locale error boundary when namespace preloading fails", async ({ message, pathname }) => {
    currentRequest.mockReturnValue(new Request(`https://store.test${pathname}`))

    const root = createRootRoute({
      beforeLoad: () => {
        throw new Error("Translation chunk unavailable")
      },
      component: Outlet,
    })

    const about = createRoute({ getParentRoute: () => root, path: pathname, staticData: { namespaces: ["pages.about"] } })
    const router = createRouter({
      defaultErrorComponent: DefaultErrorComponent,
      history: createMemoryHistory({ initialEntries: [pathname] }),
      isServer: true,
      routeTree: root.addChildren([about]),
    })
    await router.load()

    const html = renderToString(<RouterProvider router={router} />)

    expect(router.state.matches[0]?.status).toBe("error")
    expect(html).toContain(message)
    expect(html).not.toContain("Switched to client rendering")
  })

  it("renders an English not-found page without QueryClient or IntlProvider", async () => {
    currentRequest.mockReturnValue(new Request("https://store.test/en-US/missing"))

    const root = createRootRoute({ component: Outlet })
    const router = createRouter({
      defaultNotFoundComponent: DefaultNotFoundComponent,
      history: createMemoryHistory({ initialEntries: ["/en-US/missing"] }),
      isServer: true,
      routeTree: root,
    })
    await router.load()

    expect(renderToString(<RouterProvider router={router} />)).toContain("Page not found")
  })

  it.each([
    { cta: "Back to the shop", locale: "en-US", pathname: "/en-US/missing" },
    { cta: "Wróć do sklepu", locale: "pl-PL", pathname: "/brak" },
  ])("offers the $locale shopper a way back to the shop from a missing page", async ({ cta, pathname }) => {
    currentRequest.mockReturnValue(new Request(`https://store.test${pathname}`))

    const root = createRootRoute({ component: Outlet })
    const router = createRouter({
      defaultNotFoundComponent: DefaultNotFoundComponent,
      history: createMemoryHistory({ initialEntries: [pathname] }),
      isServer: true,
      routeTree: root,
    })
    await router.load()
    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain(cta)
    expect(html).toContain('href="/"')
    expect(html).toContain("min-h-[60svh]")
  })

  it.each([
    { heading: "Page not found", pathname: "/en-US/missing" },
    { heading: "Nie znaleziono strony", pathname: "/brak" },
  ])("heads the shopper's missing page $pathname with its one level-one heading", async ({ heading, pathname }) => {
    currentRequest.mockReturnValue(new Request(`https://store.test${pathname}`))

    const root = createRootRoute({ component: Outlet })
    const router = createRouter({
      defaultNotFoundComponent: DefaultNotFoundComponent,
      history: createMemoryHistory({ initialEntries: [pathname] }),
      isServer: true,
      routeTree: root,
    })
    await router.load()
    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain(`>${heading}</h1>`)
    expect(html.match(/<h1[ >]/gu)).toHaveLength(1)
  })

  it("keeps the admin not-found page plain and without the shop link", async () => {
    currentRequest.mockReturnValue(new Request("https://store.test/en-US/admin/missing"))

    const root = createRootRoute({ component: Outlet })
    const router = createRouter({
      defaultNotFoundComponent: DefaultNotFoundComponent,
      history: createMemoryHistory({ initialEntries: ["/en-US/admin/missing"] }),
      isServer: true,
      routeTree: root,
    })
    await router.load()
    const html = renderToString(<RouterProvider router={router} />)

    expect(html).toContain("Page not found")
    expect(html).not.toContain("Back to the shop")
    expect(html).toContain("min-h-screen")
  })

  it("renders a localized pending shell without a translation provider", async () => {
    const root = createRootRoute({ component: DefaultPendingComponent })
    const router = createRouter({
      history: createMemoryHistory({ initialEntries: ["/"] }),
      isServer: true,
      routeTree: root,
    })
    await router.load()

    expect(renderToString(<RouterProvider router={router} />)).toContain('aria-label="Ładowanie…"')
  })
})
