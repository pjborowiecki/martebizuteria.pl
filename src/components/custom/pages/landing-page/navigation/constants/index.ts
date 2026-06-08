import { CONSTANTS } from "~/src/constants";

import { getAssetURL } from "~/src/lib/utils";

import { LANDING_NEW_ARRIVALS_COLLECTION_HANDLE } from "~/src/modules/product/product.constants";

export const NAVIGATION_MENU_ID = "navbar-fullscreen-menu" as const;

export const NEW_ARRIVALS_COLLECTION_PATH = `/collections/${LANDING_NEW_ARRIVALS_COLLECTION_HANDLE}` as const;

export const SILVER_925_COLLECTION_HANDLE = "srebro-925" as const;
export const SILVER_925_COLLECTION_PATH = `/collections/${SILVER_925_COLLECTION_HANDLE}` as const;

export type PrimaryTranslationKey =
  | "menu.primary.newArrivals"
  | "menu.primary.silver"
  | "menu.primary.collections"
  | "menu.primary.products"
  | "menu.primary.brand";

export interface PrimaryItem {
  hash: string;
  labelKey: PrimaryTranslationKey;
  italicKey?: "menu.primary.silverItalic";
  step: number;
  image: string;
}

export const PRIMARY: readonly PrimaryItem[] = [
  {
    hash: NEW_ARRIVALS_COLLECTION_PATH,
    image: getAssetURL("marketing/menu-arrivals.webp"),
    labelKey: "menu.primary.newArrivals",
    step: 1
  },
  {
    hash: SILVER_925_COLLECTION_PATH,
    image: getAssetURL("marketing/menu-silver-925.webp"),
    italicKey: "menu.primary.silverItalic",
    labelKey: "menu.primary.silver",
    step: 2
  },
  {
    hash: CONSTANTS.ROUTES.COLLECTIONS,
    image: getAssetURL("marketing/menu-collections.webp"),
    labelKey: "menu.primary.collections",
    step: 3
  },
  {
    hash: CONSTANTS.ROUTES.PRODUCTS,
    image: getAssetURL("marketing/editorial.webp"),
    labelKey: "menu.primary.products",
    step: 4
  },
  {
    hash: CONSTANTS.ROUTES.ABOUT,
    image: getAssetURL("marketing/menu-brand.webp"),
    labelKey: "menu.primary.brand",
    step: 5
  }
];
