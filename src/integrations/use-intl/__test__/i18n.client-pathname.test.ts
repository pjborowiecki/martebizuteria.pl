import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: () => ({ client: (implementation: unknown) => implementation }) }),
}))
vi.mock("@tanstack/react-start/server", () => ({ getRequest: () => new Request("https://store.test/") }))

const { getCurrentPathname } = await import("~/src/integrations/use-intl/i18n.utils")

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("client pathname resolution", () => {
  it.each([
    { expected: "/products", pathname: "/en-US/products" },
    { expected: "/products", pathname: "/products" },
    { expected: "/", pathname: "/pl-PL" },
    { expected: "/", pathname: "/" },
  ])("reports $expected while the browser is on $pathname", ({ expected, pathname }) => {
    vi.stubGlobal("location", { pathname })

    expect(getCurrentPathname()).toBe(expected)
  })

  it("keeps a nested path below the locale segment", () => {
    vi.stubGlobal("location", { pathname: "/en-US/admin/catalog/products" })

    expect(getCurrentPathname()).toBe("/admin/catalog/products")
  })
})
