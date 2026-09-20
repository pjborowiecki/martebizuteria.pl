import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { handleLocaleMiddleware } from "~/src/integrations/use-intl/i18n.middleware"
import { deLocalizeUrl, extractLocaleFromPath, getCurrentLocale, parseLocaleCookie } from "~/src/integrations/use-intl/i18n.utils"

const { currentRequest } = vi.hoisted(() => ({ currentRequest: vi.fn<() => Request>() }))

vi.mock("cloudflare:workers", () => ({ env: { APP_ENV: "development" } }))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: currentRequest }))

describe("locale routing", () => {
  beforeEach(() => {
    currentRequest.mockReturnValue(new Request("https://store.test/en/products"))
  })

  it("preserves search and hash when stripping locale for canonical paths", () => {
    const external = new URL("https://store.test/en/products?category=rings#gold")
    const internal = deLocalizeUrl(external)

    expect(internal.href).toBe("https://store.test/products?category=rings#gold")
    expect(external.pathname).toBe("/en/products")
    expect(deLocalizeUrl(new URL("https://store.test/en")).pathname).toBe("/")
  })

  it("keeps Polish URLs unprefixed and strips redundant Polish prefixes", () => {
    currentRequest.mockReturnValue(new Request("https://store.test/products", { headers: { cookie: "marte_locale=en" } }))
    const response = handleLocaleMiddleware(new Request("https://store.test/pl/products?sort=price"))

    expect(getCurrentLocale()).toBe("pl")
    expect(response.redirect?.headers.get("location")).toBe("https://store.test/products?sort=price")
    expect(response.redirect?.status).toBe(301)
    expect(handleLocaleMiddleware(currentRequest())).toStrictEqual({ setCookie: { name: "marte_locale", value: "pl" } })
  })

  it.each(["/api/auth/get-session", "/rpc/checkout", "/_serverFn/checkout", "/assets/messages.js"])(
    "does not prefix or reset locale on %s",
    (pathname) => {
      const url = new URL(pathname, "https://store.test")
      currentRequest.mockReturnValue(new Request(url, { headers: { cookie: "marte_locale=en" } }))

      expect(getCurrentLocale()).toBe("en")
      expect(handleLocaleMiddleware(currentRequest())).toStrictEqual({})
      expect(handleLocaleMiddleware(new Request(`https://store.test/en${pathname}`)).redirect?.headers.get("location")).toBe(url.href)
    },
  )

  it("recognizes only whole supported locale segments", () => {
    expect(extractLocaleFromPath("/english/products")).toBeUndefined()
    expect(extractLocaleFromPath("/pl/products")).toBeUndefined()
    expect(extractLocaleFromPath("/en/products")).toBe("en")
  })

  it("rejects invalid cookie values without failing page requests", () => {
    expect(parseLocaleCookie("other=en; marte_locale=%65%6e")).toBe("en")
    expect(parseLocaleCookie("marte_locale=xx")).toBeUndefined()
    expect(parseLocaleCookie("marte_locale=%E0%A4%A")).toBeUndefined()
    expect(parseLocaleCookie(undefined)).toBeUndefined()
    expect(handleLocaleMiddleware(new Request("https://store.test/en", { headers: { cookie: "marte_locale=%" } }))).toStrictEqual({
      setCookie: { name: "marte_locale", value: "en" },
    })
  })
})
