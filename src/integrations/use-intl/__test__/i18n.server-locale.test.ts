import { describe, expect, it, vi } from "vite-plus/test"

const { getRequest } = vi.hoisted(() => ({ getRequest: vi.fn(() => new Request("https://store.test/")) }))

vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: (implementation: unknown) => ({ client: () => implementation }) }),
}))
vi.mock("@tanstack/react-start/server", () => ({ getRequest }))

const { deLocalizeUrl, getCurrentLocale, getCurrentPathname, localizeUrl, parseLocaleCookie } =
  await import("~/src/integrations/use-intl/i18n.utils")

const onRequest = ({ cookie, url }: { cookie?: string; url: string }): void => {
  getRequest.mockReturnValue(new Request(url, cookie === undefined ? undefined : { headers: { cookie } }))
}

describe("parseLocaleCookie", () => {
  it("reads a supported locale out of the cookie header", () => {
    expect(parseLocaleCookie("marte_locale=en-US")).toBe("en-US")
  })

  it("reads the locale cookie when other cookies surround it", () => {
    expect(parseLocaleCookie("theme=dark; marte_locale=pl-PL; sidebar=open")).toBe("pl-PL")
  })

  it("ignores a locale the store does not support", () => {
    expect(parseLocaleCookie("marte_locale=de-DE")).toBeUndefined()
  })

  it("ignores a header that carries no locale cookie", () => {
    expect(parseLocaleCookie("theme=dark")).toBeUndefined()
  })

  it.each([[null], [undefined], [""]])("reports nothing for the %j header", (header) => {
    expect(parseLocaleCookie(header)).toBeUndefined()
  })
})

describe("getCurrentPathname", () => {
  it.each([
    { expected: "/products", url: "https://store.test/en-US/products" },
    { expected: "/products", url: "https://store.test/products" },
    { expected: "/", url: "https://store.test/pl-PL" },
    { expected: "/cart", url: "https://store.test/cart?step=2" },
  ])("reports $expected for $url", ({ expected, url }) => {
    onRequest({ url })

    expect(getCurrentPathname()).toBe(expected)
  })
})

describe("server locale resolution", () => {
  it.each([
    { expected: "en-US", url: "https://store.test/en-US/products" },
    { expected: "pl-PL", url: "https://store.test/products" },
    { expected: "pl-PL", url: "https://store.test/pl-PL/products" },
  ])("reads $expected from $url", ({ expected, url }) => {
    onRequest({ url })

    expect(getCurrentLocale()).toBe(expected)
  })

  it("falls back to the cookie on a path the locale prefix never reaches", () => {
    onRequest({ cookie: "marte_locale=en-US", url: "https://store.test/api/checkout" })

    expect(getCurrentLocale()).toBe("en-US")
  })

  it("falls back to the default locale when an ignored path carries no cookie", () => {
    onRequest({ url: "https://store.test/_serverFn/cart" })

    expect(getCurrentLocale()).toBe("pl-PL")
  })

  it("ignores the cookie on a path that does carry a locale prefix", () => {
    onRequest({ cookie: "marte_locale=en-US", url: "https://store.test/pl-PL/products" })

    expect(getCurrentLocale()).toBe("pl-PL")
  })
})

describe("localizeUrl", () => {
  it("prefixes the path with the locale the request is on", () => {
    onRequest({ url: "https://store.test/en-US/products" })

    expect(localizeUrl(new URL("https://store.test/cart")).toString()).toBe("https://store.test/en-US/cart")
  })

  it("keeps the query string and hash intact", () => {
    onRequest({ url: "https://store.test/en-US/products" })

    expect(localizeUrl(new URL("https://store.test/cart?step=2#summary")).toString()).toBe("https://store.test/en-US/cart?step=2#summary")
  })

  it("leaves the path unprefixed for the default locale", () => {
    onRequest({ url: "https://store.test/products" })

    expect(localizeUrl(new URL("https://store.test/cart")).toString()).toBe("https://store.test/cart")
  })

  it("does not mutate the url it was given", () => {
    onRequest({ url: "https://store.test/en-US/products" })
    const url = new URL("https://store.test/cart")
    localizeUrl(url)

    expect(url.pathname).toBe("/cart")
  })
})

describe("deLocalizeUrl", () => {
  it.each([
    { expected: "https://store.test/cart", url: "https://store.test/en-US/cart" },
    { expected: "https://store.test/cart", url: "https://store.test/cart" },
    { expected: "https://store.test/", url: "https://store.test/pl-PL" },
  ])("rewrites $url to $expected", ({ expected, url }) => {
    expect(deLocalizeUrl(new URL(url)).toString()).toBe(expected)
  })

  it("keeps the query string while dropping the locale prefix", () => {
    expect(deLocalizeUrl(new URL("https://store.test/en-US/products?page=2")).toString()).toBe("https://store.test/products?page=2")
  })
})
