import { QueryClient } from "@tanstack/react-query"
import { createMemoryHistory, createRoute, createRouter } from "@tanstack/react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

const intl = vi.hoisted(() => ({ locale: "en-US" as "en-US" | "pl-PL", pathname: "/" }))
const preloadNamespaces = vi.hoisted(() => vi.fn<() => Promise<void>>())

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (path: string) => path,
}))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({
  getCurrentSession: () => Promise.resolve(undefined),
  getCurrentSessionQuery: { queryKey: ["session", "current"] },
}))
vi.mock("~/src/integrations/use-intl/i18n.messages", () => ({
  getRouteNamespaces: () => [],
  preloadNamespaces,
}))
vi.mock("~/src/integrations/use-intl/i18n.utils", () => ({
  getCurrentLocale: () => intl.locale,
  getCurrentPathname: () => intl.pathname,
}))

import { Route as RootRoute } from "~/src/routes/__root"

import { ImagePrefetchService } from "~/src/lib/image"

import { APP_ICON, APP_NAME, APP_URL, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, THEME_COLOR } from "~/src/presentation/branding/app"

const loadRootMatch = async (pathname: string) => {
  const catchAll = createRoute({ getParentRoute: () => RootRoute, path: "$" })
  const index = createRoute({ getParentRoute: () => RootRoute, path: "/" })
  const router = createRouter({
    context: { imagePrefetchService: new ImagePrefetchService(), queryClient: new QueryClient() },
    history: createMemoryHistory({ initialEntries: [pathname] }),
    routeTree: RootRoute.addChildren([index, catchAll]),
  })
  await router.load()
  const [match] = router.state.matches
  if (match === undefined) {
    throw new Error("the root route produced no match")
  }

  return match
}

const named = async (pathname: string, name: string) => {
  const match = await loadRootMatch(pathname)

  return (match.meta ?? []).filter((entry) => entry?.name === name).map((entry) => entry?.content)
}

const propertied = async (pathname: string, property: string) => {
  const match = await loadRootMatch(pathname)

  return (match.meta ?? []).filter((entry) => entry?.property === property).map((entry) => entry?.content)
}

beforeEach(() => {
  preloadNamespaces.mockReset().mockResolvedValue(undefined)
  intl.locale = "en-US"
  intl.pathname = "/"
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("root head document metadata", () => {
  it("names the app and pins the utf8 charset and responsive viewport", async () => {
    const match = await loadRootMatch("/")

    expect(match.meta).toContainEqual({ charSet: "utf8" })
    expect(match.meta).toContainEqual({ title: APP_NAME })
    expect(match.meta).toContainEqual({ content: "width=device-width, initial-scale=1", name: "viewport" })
  })

  it("publishes the brand theme colour", async () => {
    await expect(named("/", "theme-color")).resolves.toStrictEqual([THEME_COLOR])
  })

  it("describes the page as a website of the brand", async () => {
    await expect(propertied("/", "og:type")).resolves.toStrictEqual(["website"])
    await expect(propertied("/", "og:site_name")).resolves.toStrictEqual([APP_NAME])
    await expect(propertied("/", "og:image:alt")).resolves.toStrictEqual([APP_NAME])
  })

  it("points the social image at the absolute og asset with its declared size", async () => {
    await expect(propertied("/", "og:image")).resolves.toStrictEqual([`${APP_URL}/og.png`])
    await expect(propertied("/", "og:image:width")).resolves.toStrictEqual([OG_IMAGE_WIDTH])
    await expect(propertied("/", "og:image:height")).resolves.toStrictEqual([OG_IMAGE_HEIGHT])
  })

  it("asks Twitter for a large summary card using the same image", async () => {
    await expect(named("/", "twitter:card")).resolves.toStrictEqual(["summary_large_image"])
    await expect(named("/", "twitter:image")).resolves.toStrictEqual([`${APP_URL}/og.png`])
  })

  it("advertises the localized page url as the open graph url", async () => {
    await expect(propertied("/products", "og:url")).resolves.toStrictEqual([`${APP_URL}/en-US/products`])
  })
})

describe("root head locale handling", () => {
  it("declares the active locale and every other supported locale as an alternate", async () => {
    await expect(propertied("/", "og:locale")).resolves.toStrictEqual(["en-US"])
    await expect(propertied("/", "og:locale:alternate")).resolves.toStrictEqual(["pl-PL"])
  })

  it("keeps the default locale unprefixed in the canonical url", async () => {
    intl.locale = "pl-PL"
    const match = await loadRootMatch("/products")

    expect((match.links ?? []).find((link) => link?.rel === "canonical")?.href).toBe(`${APP_URL}/products`)
  })

  it("prefixes the canonical url for a non default locale", async () => {
    const match = await loadRootMatch("/products")

    expect((match.links ?? []).find((link) => link?.rel === "canonical")?.href).toBe(`${APP_URL}/en-US/products`)
  })

  it("offers an hreflang alternate per locale plus an x-default", async () => {
    const match = await loadRootMatch("/products")
    const alternates = (match.links ?? [])
      .filter((link) => link?.rel === "alternate")
      .map((link) => ({ href: link?.href, hrefLang: link?.hrefLang, rel: link?.rel }))

    expect(alternates).toStrictEqual([
      { href: `${APP_URL}/products`, hrefLang: "pl-PL", rel: "alternate" },
      { href: `${APP_URL}/en-US/products`, hrefLang: "en-US", rel: "alternate" },
      { href: `${APP_URL}/products`, hrefLang: "x-default", rel: "alternate" },
    ])
  })

  it("does not double prefix a pathname that already carries the locale", async () => {
    const match = await loadRootMatch("/en-US/products")

    expect((match.links ?? []).find((link) => link?.rel === "canonical")?.href).toBe(`${APP_URL}/en-US/products`)
  })
})

describe("root head stylesheet and icons", () => {
  it("loads the global stylesheet before anything else", async () => {
    const match = await loadRootMatch("/")
    const [first] = match.links ?? []

    expect(first?.rel).toBe("stylesheet")
  })

  it("registers the brand icon as both favicon and apple touch icon", async () => {
    const match = await loadRootMatch("/")

    expect(match.links).toContainEqual({ href: APP_ICON, rel: "icon", type: "image/svg+xml" })
    expect(match.links).toContainEqual({ href: APP_ICON, rel: "apple-touch-icon" })
  })
})

describe("root head indexing rules", () => {
  it("allows public storefront pages to be indexed in production", async () => {
    vi.stubEnv("MODE", "production")

    await expect(named("/products", "robots")).resolves.toStrictEqual([])
  })

  it.each(["/account/overview", "/admin/overview", "/checkout"])("keeps %s private in production", async (path) => {
    vi.stubEnv("MODE", "production")

    await expect(named(path, "robots")).resolves.toStrictEqual(["noindex, nofollow"])
  })

  it("keeps the storefront out of the index outside a production build", async () => {
    await expect(named("/", "robots")).resolves.toStrictEqual(["noindex, nofollow"])
  })

  it("never allows the account, admin or checkout areas to be indexed", async () => {
    for (const path of ["/account/overview", "/admin/overview", "/checkout"]) {
      await expect(named(path, "robots")).resolves.toStrictEqual(["noindex, nofollow"])
    }
  })
})

describe("root head critical admin styles", () => {
  it("inlines the admin chrome and the collapsed sidebar widths on an admin path", async () => {
    const match = await loadRootMatch("/admin/overview")
    const [style] = match.styles ?? []
    const children = style?.children

    expect(typeof children === "string" ? children : "").toContain("html[data-admin-shell]")
    expect(typeof children === "string" ? children : "").toContain('[data-slot="sidebar-gap"]')
  })

  it("inlines no critical style on a storefront path", async () => {
    const match = await loadRootMatch("/products")

    expect(match.styles).toBeUndefined()
  })
})

describe("root route context", () => {
  it("builds fallback metadata if loading localized messages fails before context is available", async () => {
    preloadNamespaces.mockRejectedValueOnce(new Error("Messages unavailable"))

    const match = await loadRootMatch("/products")

    expect(match.status).toBe("error")
    expect((match.links ?? []).find((link) => link?.rel === "canonical")?.href).toBe(`${APP_URL}/`)
    expect(match.meta).toContainEqual({ content: "pl-PL", property: "og:locale" })
  })

  it("carries the request pathname and the detected locale into the route context", async () => {
    const match = await loadRootMatch("/admin/customers")

    expect(match.context.internalPathname).toBe("/admin/customers")
    expect(match.context.locale).toBe("en-US")
  })

  it("detects the polish locale for the same pathname", async () => {
    intl.locale = "pl-PL"
    const match = await loadRootMatch("/admin/customers")

    expect(match.context.locale).toBe("pl-PL")
  })
})
