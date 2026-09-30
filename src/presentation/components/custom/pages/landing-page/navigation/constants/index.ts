import { LANDING_NEW_ARRIVALS_COLLECTION_HANDLE } from "~/src/modules/product/product.constants"

import { getAssetURL } from "~/src/lib/url"

import { ROUTES } from "~/src/routes"

export const NAVIGATION_MENU_ID = "navbar-fullscreen-menu" as const

export const NEW_ARRIVALS_COLLECTION_PATH = `/collections/${LANDING_NEW_ARRIVALS_COLLECTION_HANDLE}` as const

export const SILVER_925_COLLECTION_HANDLE = "srebro-925" as const

export const SILVER_925_COLLECTION_PATH = `/collections/${SILVER_925_COLLECTION_HANDLE}` as const

export const GOLD_585_COLLECTION_HANDLE = "zloto-585" as const

export const GOLD_585_COLLECTION_PATH = `/collections/${GOLD_585_COLLECTION_HANDLE}` as const

export type PrimaryTranslationKey =
  | "menu.primary.newArrivals"
  | "menu.primary.silver"
  | "menu.primary.gold"
  | "menu.primary.collections"
  | "menu.primary.products"
  | "menu.primary.brand"

interface PrimaryDestination {
  hash: string
  labelKey: PrimaryTranslationKey
  italicKey?: "menu.primary.silverItalic" | "menu.primary.goldItalic"
  step: number
}

export type PrimaryItem = (PrimaryDestination & { collectionHandle: string }) | (PrimaryDestination & { image: string })

export const PRIMARY: readonly PrimaryItem[] = [
  {
    collectionHandle: LANDING_NEW_ARRIVALS_COLLECTION_HANDLE,
    hash: NEW_ARRIVALS_COLLECTION_PATH,
    labelKey: "menu.primary.newArrivals",
    step: 1,
  },
  {
    collectionHandle: SILVER_925_COLLECTION_HANDLE,
    hash: SILVER_925_COLLECTION_PATH,
    italicKey: "menu.primary.silverItalic",
    labelKey: "menu.primary.silver",
    step: 2,
  },
  {
    collectionHandle: GOLD_585_COLLECTION_HANDLE,
    hash: GOLD_585_COLLECTION_PATH,
    italicKey: "menu.primary.goldItalic",
    labelKey: "menu.primary.gold",
    step: 3,
  },
  {
    hash: ROUTES.COLLECTIONS,
    image: getAssetURL("marketing/menu-collections.webp"),
    labelKey: "menu.primary.collections",
    step: 4,
  },
  {
    hash: ROUTES.PRODUCTS,
    image: getAssetURL("marketing/editorial.webp"),
    labelKey: "menu.primary.products",
    step: 5,
  },
  {
    hash: ROUTES.ABOUT,
    image: getAssetURL("marketing/menu-brand.webp"),
    labelKey: "menu.primary.brand",
    step: 6,
  },
]
