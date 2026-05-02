import { getAssetURL } from "~/src/lib/utils";

export const NAVIGATION_MENU_ID = "navbar-fullscreen-menu" as const;

export type PrimaryTranslationKey = "menu.primary.newArrivals" | "menu.primary.silver" | "menu.primary.collections" | "menu.primary.brand";

export interface PrimaryItem {
  hash: string;
  labelKey: PrimaryTranslationKey;
  italicKey?: "menu.primary.silverItalic";
  step: number;
  image: string;
}

export const PRIMARY: readonly PrimaryItem[] = [
  {
    hash: "#nowosci",
    image: getAssetURL("marketing/menu-arrivals.webp"),
    labelKey: "menu.primary.newArrivals",
    step: 1
  },
  {
    hash: "#srebro",
    image: getAssetURL("marketing/menu-silver-925.webp"),
    italicKey: "menu.primary.silverItalic",
    labelKey: "menu.primary.silver",
    step: 2
  },
  {
    hash: "#kolekcje",
    image: getAssetURL("marketing/menu-collections.webp"),
    labelKey: "menu.primary.collections",
    step: 3
  },
  {
    hash: "#marka",
    image: getAssetURL("marketing/menu-brand.webp"),
    labelKey: "menu.primary.brand",
    step: 4
  }
];
