import { getAssetURL } from "~/src/lib/url"

export const LANDING_HERO_IMG = getAssetURL("marketing/hero.webp")

export const LANDING_VIDEO_POSTER = getAssetURL("placeholder.svg")

export const LANDING_VIDEO_SRC = getAssetURL("marketing/landing-video.mp4")

export const LANDING_SHOP_COLLECTIONS = [
  {
    descKey: "items.newArrivals.description",
    image: getAssetURL("collections/new_arrivals.webp"),
    nameKey: "items.newArrivals.name",
    slug: "nowosci",
  },
  {
    descKey: "items.silver.description",
    image: getAssetURL("collections/silver925.webp"),
    nameKey: "items.silver.name",
    slug: "srebro-925",
  },
  {
    descKey: "items.gold.description",
    image: getAssetURL("collections/gold585.webp"),
    nameKey: "items.gold.name",
    slug: "zloto-585",
  },
] as const
