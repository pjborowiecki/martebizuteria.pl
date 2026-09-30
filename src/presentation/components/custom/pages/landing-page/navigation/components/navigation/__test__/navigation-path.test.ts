import { describe, expect, it } from "vite-plus/test"

import {
  resolveLocalizedMenuPath,
  resolveMenuPathNavigation,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/components/navigation/navigation-path"

import { ROUTES } from "~/src/routes"

describe("resolveMenuPathNavigation", () => {
  it.each([["/"], ["/unknown-page"], ["/blog/nested/too-deep"], [""], ["not-a-path"]])(
    "sends the unroutable menu path %j to the home route",
    (path) => {
      expect(resolveMenuPathNavigation(path)).toStrictEqual({ to: "/" })
    },
  )

  it.each([
    ["/blog/silver-care", { params: { slug: "silver-care" }, to: "/blog/$slug" }],
    ["/collections/spring", { params: { handle: "spring" }, to: "/collections/$handle" }],
    ["/categories/rings", { params: { handle: "rings" }, to: "/categories/$handle" }],
    ["/products/silver-ring", { params: { handle: "silver-ring" }, to: "/products/$handle" }],
  ])("splits %s into its route pattern and param", (path, expected) => {
    expect(resolveMenuPathNavigation(path)).toStrictEqual(expected)
  })

  it.each([
    ["/about", "/about"],
    ["/blog", "/blog"],
    ["/cart", "/cart"],
    ["/checkout", "/checkout"],
    ["/collections", "/collections"],
    ["/categories", "/categories"],
    ["/faq", "/faq"],
    ["/products", "/products"],
    ["/privacy-policy", "/privacy-policy"],
    ["/terms-of-service", "/terms-of-service"],
    ["/exchanges-and-returns", "/exchanges-and-returns"],
    ["/account", "/account"],
  ])("maps the static menu path %s onto its own route", (path, expected) => {
    expect(resolveMenuPathNavigation(path)).toStrictEqual({ to: expected })
  })

  it("ignores a trailing slash on a static path", () => {
    expect(resolveMenuPathNavigation("/about/")).toStrictEqual({ to: "/about" })
  })

  it("ignores a trailing slash on a parametric path", () => {
    expect(resolveMenuPathNavigation("/products/silver-ring/")).toStrictEqual({
      params: { handle: "silver-ring" },
      to: "/products/$handle",
    })
  })

  it("does not treat a bare parametric prefix as a detail page", () => {
    expect(resolveMenuPathNavigation("/blog/")).toStrictEqual({ to: "/blog" })
  })
})

describe("resolveLocalizedMenuPath", () => {
  it.each([["/"], ["/unknown-page"], ["/categories/deep/handle"]])(
    "sends the unroutable menu path %j to the localized home route",
    (path) => {
      expect(resolveLocalizedMenuPath(path)).toStrictEqual({ to: ROUTES.HOME })
    },
  )

  it.each([
    ["/blog/silver-care", { params: { slug: "silver-care" }, to: ROUTES.BLOG_POST }],
    ["/collections/spring", { params: { handle: "spring" }, to: ROUTES.COLLECTION }],
    ["/categories/rings", { params: { handle: "rings" }, to: ROUTES.CATEGORY }],
    ["/products/silver-ring", { params: { handle: "silver-ring" }, to: ROUTES.PRODUCT }],
  ])("resolves %s to the localized parametric route", (path, expected) => {
    expect(resolveLocalizedMenuPath(path)).toStrictEqual(expected)
  })

  it.each([
    [ROUTES.ABOUT],
    [ROUTES.BLOG],
    [ROUTES.ACCOUNT],
    [ROUTES.CART],
    [ROUTES.CHECKOUT],
    [ROUTES.COLLECTIONS],
    [ROUTES.CATEGORIES],
    [ROUTES.EXCHANGES_AND_RETURNS],
    [ROUTES.FAQ],
    [ROUTES.PRIVACY_POLICY],
    [ROUTES.PRODUCTS],
    [ROUTES.TERMS_OF_SERVICE],
  ])("resolves the static localized menu path %s to itself", (path) => {
    expect(resolveLocalizedMenuPath(path)).toStrictEqual({ to: path })
  })

  it("normalises a trailing slash before matching", () => {
    expect(resolveLocalizedMenuPath(`${ROUTES.COLLECTIONS}/`)).toStrictEqual({ to: ROUTES.COLLECTIONS })
  })
})
