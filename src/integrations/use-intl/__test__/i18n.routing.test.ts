import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"
import { extractLocaleFromPath, localeLinks, localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { deLocalizeUrl, getCurrentLocale, parseLocaleCookie } from "~/src/integrations/use-intl/i18n.utils"

const { currentRequest } = vi.hoisted(() => ({ currentRequest: vi.fn<() => Request>() }))

vi.mock("@tanstack/react-start/server", () => ({ getRequest: currentRequest }))

describe("locale routing", () => {
  beforeEach(() => {
    currentRequest.mockReturnValue(new Request("https://store.test/en-US/products"))
  })

  it("preserves search and hash when stripping locale for canonical paths", () => {
    const external = new URL("https://store.test/en-US/products?category=rings#gold")
    const internal = deLocalizeUrl(external)

    expect(internal.href).toBe("https://store.test/products?category=rings#gold")
    expect(external.pathname).toBe("/en-US/products")
    expect(deLocalizeUrl(new URL("https://store.test/en-US")).pathname).toBe("/")
  })

  it("keeps Polish URLs unprefixed and strips redundant Polish prefixes", () => {
    currentRequest.mockReturnValue(new Request("https://store.test/products", { headers: { cookie: "marte_locale=en-US" } }))
    const response = resolveLocale(new Request("https://store.test/pl-PL/products?sort=price"))

    expect(getCurrentLocale()).toBe("pl-PL")
    expect(response.redirect?.headers.get("location")).toBe("https://store.test/products?sort=price")
    expect(response.redirect?.status).toBe(301)
    expect(resolveLocale(currentRequest())).toStrictEqual({ setCookie: { name: "marte_locale", value: "pl-PL" } })
  })

  it.each(["/api/auth/get-session", "/rpc/checkout", "/_serverFn/checkout", "/assets/messages.js"])(
    "does not prefix or reset locale on %s",
    (pathname) => {
      const url = new URL(pathname, "https://store.test")
      currentRequest.mockReturnValue(new Request(url, { headers: { cookie: "marte_locale=en-US" } }))

      expect(getCurrentLocale()).toBe("en-US")
      expect(resolveLocale(currentRequest())).toStrictEqual({})
      expect(resolveLocale(new Request(`https://store.test/en-US${pathname}`)).redirect?.headers.get("location")).toBe(url.href)

      currentRequest.mockReturnValue(new Request(url))

      expect(getCurrentLocale()).toBe("pl-PL")
    },
  )

  it("recognizes only whole supported locale segments", () => {
    expect(extractLocaleFromPath("/english/products")).toBeUndefined()
    expect(extractLocaleFromPath("/en/products")).toBeUndefined()
    expect(extractLocaleFromPath("/pl-PL/products")).toBeUndefined()
    expect(extractLocaleFromPath("/en-US/products")).toBe("en-US")
  })

  it("rejects invalid cookie values without failing page requests", () => {
    expect(parseLocaleCookie("other=en-US; marte_locale=%65%6e-US")).toBe("en-US")
    expect(parseLocaleCookie("marte_locale=en")).toBeUndefined()
    expect(parseLocaleCookie("marte_locale=%E0%A4%A")).toBeUndefined()
    expect(parseLocaleCookie(undefined)).toBeUndefined()
    expect(resolveLocale(new Request("https://store.test/en-US", { headers: { cookie: "marte_locale=%" } }))).toStrictEqual({
      setCookie: { name: "marte_locale", value: "en-US" },
    })
  })

  it("leaves the cookie untouched when the URL already matches it", () => {
    expect(resolveLocale(new Request("https://store.test/products", { headers: { cookie: "marte_locale=pl-PL" } }))).toStrictEqual({})
    expect(resolveLocale(new Request("https://store.test/en-US/products", { headers: { cookie: "marte_locale=en-US" } }))).toStrictEqual({})
  })

  it.each([
    { expected: "https://store.test/products", pathname: "/pl/products" },
    { expected: "https://store.test/en-US/products", pathname: "/en/products" },
    { expected: "https://store.test/", pathname: "/pl" },
    { expected: "https://store.test/en-US", pathname: "/en" },
  ])("redirects the legacy $pathname prefix to its BCP-47 form", ({ expected, pathname }) => {
    expect(resolveLocale(new Request(`https://store.test${pathname}`)).redirect?.headers.get("location")).toBe(expected)
  })

  it.each(["/english/products", "/products", "/"])("leaves %s untouched", (pathname) => {
    expect(resolveLocale(new Request(`https://store.test${pathname}`)).redirect).toBeUndefined()
  })

  it.each([
    { init: { method: "POST" }, label: "form submissions" },
    { init: { headers: { "sec-fetch-dest": "empty" } }, label: "client fetches" },
    { init: { headers: { accept: "application/json" } }, label: "JSON requests" },
  ])("never redirects $label away from a localized path", ({ init }) => {
    expect(resolveLocale(new Request("https://store.test/pl-PL/checkout", init))).toStrictEqual({})
  })

  it.each(["document", "frame", "iframe"])("canonicalizes %s navigations", (destination) => {
    const response = resolveLocale(new Request("https://store.test/pl-PL/checkout", { headers: { "sec-fetch-dest": destination } }))

    expect(response.redirect?.headers.get("location")).toBe("https://store.test/checkout")
  })

  it("leaves paths that are not site-relative unlocalized", () => {
    expect(localizePathname({ locale: "en-US", pathname: "products" })).toBe("products")
    expect(localizePathname({ locale: "en-US", pathname: "//store.test/products" })).toBe("//store.test/products")
  })

  it("advertises every locale plus an x-default alternate", () => {
    expect(localeLinks({ origin: "https://store.test", pathname: "/en-US/products" })).toStrictEqual([
      { href: "https://store.test/en-US/products", rel: "canonical" },
      { href: "https://store.test/products", hrefLang: "pl-PL", rel: "alternate" },
      { href: "https://store.test/en-US/products", hrefLang: "en-US", rel: "alternate" },
      { href: "https://store.test/products", hrefLang: "x-default", rel: "alternate" },
    ])
  })
})
