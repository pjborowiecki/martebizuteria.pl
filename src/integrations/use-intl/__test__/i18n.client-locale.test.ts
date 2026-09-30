import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: () => ({ client: (implementation: unknown) => implementation }) }),
}))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("https://store.test/") }))

const { getCurrentLocale } = await import("~/src/integrations/use-intl/i18n.utils")

const stubBrowser = ({ cookie, pathname }: { cookie: string; pathname: string }): void => {
  vi.stubGlobal("location", { pathname })
  vi.stubGlobal("document", { cookie })
}

describe("client locale resolution", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it.each([
    { expected: "en-US", pathname: "/en-US/products" },
    { expected: "pl-PL", pathname: "/products" },
    { expected: "pl-PL", pathname: "/pl-PL/products" },
  ])("reads $expected from $pathname", ({ expected, pathname }) => {
    stubBrowser({ cookie: "", pathname })

    expect(getCurrentLocale()).toBe(expected)
  })

  it.each([
    { cookie: "marte_locale=en-US", expected: "en-US" },
    { cookie: "marte_locale=nope", expected: "pl-PL" },
    { cookie: "", expected: "pl-PL" },
  ])("falls back to the $cookie cookie on paths without a locale prefix", ({ cookie, expected }) => {
    stubBrowser({ cookie, pathname: "/rpc/checkout" })

    expect(getCurrentLocale()).toBe(expected)
  })
})
