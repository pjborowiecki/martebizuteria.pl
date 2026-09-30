import { describe, expect, it, vi } from "vite-plus/test"

import { LANDING_NEW_ARRIVALS_COLLECTION_HANDLE } from "~/src/modules/product/product.constants"

import {
  NAVIGATION_MENU_ID,
  NEW_ARRIVALS_COLLECTION_PATH,
  PRIMARY,
  SILVER_925_COLLECTION_HANDLE,
  SILVER_925_COLLECTION_PATH,
} from "~/src/presentation/components/custom/pages/landing-page/navigation/constants"

import { ROUTES } from "~/src/routes"

vi.mock("cloudflare:workers", () => ({ env: { VITE_R2_URL: "https://images.test" } }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: (fn: unknown) => ({ client: () => fn }) }),
}))

describe("navigation collection paths", () => {
  it("derives the new arrivals path from the shared collection handle", () => {
    expect(NEW_ARRIVALS_COLLECTION_PATH).toBe(`/collections/${LANDING_NEW_ARRIVALS_COLLECTION_HANDLE}`)
  })

  it("points the silver entry at the srebro-925 collection", () => {
    expect(SILVER_925_COLLECTION_HANDLE).toBe("srebro-925")
    expect(SILVER_925_COLLECTION_PATH).toBe("/collections/srebro-925")
  })

  it("names the fullscreen menu so the trigger can reference it", () => {
    expect(NAVIGATION_MENU_ID).toBe("navbar-fullscreen-menu")
  })
})

describe("PRIMARY navigation items", () => {
  it("links each entry to its destination in menu order", () => {
    expect(PRIMARY.map((item) => item.hash)).toStrictEqual([
      NEW_ARRIVALS_COLLECTION_PATH,
      SILVER_925_COLLECTION_PATH,
      ROUTES.COLLECTIONS,
      ROUTES.PRODUCTS,
      ROUTES.ABOUT,
    ])
  })

  it("numbers the steps consecutively from one", () => {
    expect(PRIMARY.map((item) => item.step)).toStrictEqual([1, 2, 3, 4, 5])
  })

  it("resolves every image against the configured asset cdn", () => {
    expect(PRIMARY.map((item) => item.image)).toStrictEqual([
      "https://images.test/marketing/menu-arrivals.webp",
      "https://images.test/marketing/menu-silver-925.webp",
      "https://images.test/marketing/menu-collections.webp",
      "https://images.test/marketing/editorial.webp",
      "https://images.test/marketing/menu-brand.webp",
    ])
  })

  it("namespaces every label key under menu.primary", () => {
    expect(PRIMARY.map((item) => item.labelKey)).toStrictEqual([
      "menu.primary.newArrivals",
      "menu.primary.silver",
      "menu.primary.collections",
      "menu.primary.products",
      "menu.primary.brand",
    ])
  })

  it("adds an italic key to the silver entry alone", () => {
    const withItalics = PRIMARY.filter((item) => item.italicKey !== undefined)

    expect(withItalics).toHaveLength(1)
    expect(withItalics[0]?.labelKey).toBe("menu.primary.silver")
    expect(withItalics[0]?.italicKey).toBe("menu.primary.silverItalic")
  })
})
