import { describe, expect, it, vi } from "vite-plus/test"

import { LANDING_NEW_ARRIVALS_COLLECTION_HANDLE } from "~/src/modules/product/product.constants"

import {
  GOLD_585_COLLECTION_HANDLE,
  GOLD_585_COLLECTION_PATH,
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

  it("points the gold entry at the zloto-585 collection", () => {
    expect(GOLD_585_COLLECTION_HANDLE).toBe("zloto-585")
    expect(GOLD_585_COLLECTION_PATH).toBe("/collections/zloto-585")
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
      GOLD_585_COLLECTION_PATH,
      ROUTES.COLLECTIONS,
      ROUTES.PRODUCTS,
      ROUTES.ABOUT,
    ])
  })

  it("numbers the steps consecutively from one", () => {
    expect(PRIMARY.map((item) => item.step)).toStrictEqual([1, 2, 3, 4, 5, 6])
  })

  it("illustrates the collection entries from their collection record rather than a bundled asset", () => {
    expect(PRIMARY.map((item) => ("collectionHandle" in item ? item.collectionHandle : undefined))).toStrictEqual([
      LANDING_NEW_ARRIVALS_COLLECTION_HANDLE,
      SILVER_925_COLLECTION_HANDLE,
      GOLD_585_COLLECTION_HANDLE,
      undefined,
      undefined,
      undefined,
    ])
  })

  it("resolves the editorial artwork against the configured asset cdn", () => {
    expect(PRIMARY.map((item) => ("image" in item ? item.image : undefined))).toStrictEqual([
      undefined,
      undefined,
      undefined,
      "https://images.test/marketing/menu-collections.webp",
      "https://images.test/marketing/editorial.webp",
      "https://images.test/marketing/menu-brand.webp",
    ])
  })

  it("namespaces every label key under menu.primary", () => {
    expect(PRIMARY.map((item) => item.labelKey)).toStrictEqual([
      "menu.primary.newArrivals",
      "menu.primary.silver",
      "menu.primary.gold",
      "menu.primary.collections",
      "menu.primary.products",
      "menu.primary.brand",
    ])
  })

  it("adds an italic key to the alloy entries alone", () => {
    const withItalics = PRIMARY.filter((item) => item.italicKey !== undefined)

    expect(withItalics.map((item) => [item.labelKey, item.italicKey])).toStrictEqual([
      ["menu.primary.silver", "menu.primary.silverItalic"],
      ["menu.primary.gold", "menu.primary.goldItalic"],
    ])
  })
})
