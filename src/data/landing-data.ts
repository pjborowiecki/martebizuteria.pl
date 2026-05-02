import { getAssetURL } from "~/src/lib/utils";

export const LANDING_HERO_IMG = getAssetURL("marketing/hero.webp");
export const LANDING_VIDEO_POSTER = getAssetURL("placeholder.svg");
export const LANDING_VIDEO_SRC = getAssetURL("marketing/landing-video.mp4");

export const LANDING_PRODUCTS = [
  {
    detailsKey: "newArrivals.items.lapis.details",
    image: getAssetURL("products/lapis_lazuli_main.webp"),
    nameKey: "newArrivals.items.lapis.name",
    priceKey: "newArrivals.items.lapis.price"
  },
  {
    detailsKey: "newArrivals.items.onyks.details",
    image: getAssetURL("products/onyks_main.webp"),
    nameKey: "newArrivals.items.onyks.name",
    priceKey: "newArrivals.items.onyks.price"
  },
  {
    detailsKey: "newArrivals.items.vintageOnyksSilver.details",
    image: getAssetURL("products/vintage_onyks_main.webp"),
    nameKey: "newArrivals.items.vintageOnyksSilver.name",
    priceKey: "newArrivals.items.vintageOnyksSilver.price"
  },
  {
    detailsKey: "newArrivals.items.vintageOnyksGolden.details",
    image: getAssetURL("products/vintage_onyks_golden_main.webp"),
    nameKey: "newArrivals.items.vintageOnyksGolden.name",
    priceKey: "newArrivals.items.vintageOnyksGolden.price"
  },
  {
    detailsKey: "newArrivals.items.ginkgo.details",
    image: getAssetURL("products/ginkgo_main.webp"),
    nameKey: "newArrivals.items.ginkgo.name",
    priceKey: "newArrivals.items.ginkgo.price"
  },
  {
    detailsKey: "newArrivals.items.oliwin.details",
    image: getAssetURL("products/oliwin_main.webp"),
    nameKey: "newArrivals.items.oliwin.name",
    priceKey: "newArrivals.items.oliwin.price"
  }
] as const;

export const LANDING_CATEGORY_PANELS = [
  {
    buttonTextKey: "categories.panels.necklaces.buttonText",
    image: getAssetURL("categories/necklaces.webp"),
    subtitleKey: "categories.panels.necklaces.subtitle",
    tagKey: "categories.panels.necklaces.tag",
    titleKey: "categories.panels.necklaces.title"
  },
  {
    buttonTextKey: "categories.panels.earrings.buttonText",
    image: getAssetURL("categories/earrings.webp"),
    subtitleKey: "categories.panels.earrings.subtitle",
    tagKey: "categories.panels.earrings.tag",
    titleKey: "categories.panels.earrings.title"
  },
  {
    buttonTextKey: "categories.panels.chokers.buttonText",
    image: getAssetURL("categories/chokers.webp"),
    subtitleKey: "categories.panels.chokers.subtitle",
    tagKey: "categories.panels.chokers.tag",
    titleKey: "categories.panels.chokers.title"
  },
  {
    buttonTextKey: "categories.panels.bracelets.buttonText",
    image: getAssetURL("categories/bracelets.webp"),
    subtitleKey: "categories.panels.bracelets.subtitle",
    tagKey: "categories.panels.bracelets.tag",
    titleKey: "categories.panels.bracelets.title"
  },
  {
    buttonTextKey: "categories.panels.birthdayBracelets.buttonText",
    image: getAssetURL("categories/birthday_bracelets.webp"),
    subtitleKey: "categories.panels.birthdayBracelets.subtitle",
    tagKey: "categories.panels.birthdayBracelets.tag",
    titleKey: "categories.panels.birthdayBracelets.title"
  }
] as const;

export const LANDING_ARCHIVE_ARTICLES = [
  { href: "/collections" as const, titleKey: "archive.articles.golden" },
  { href: "/collections" as const, titleKey: "archive.articles.sustainability" },
  { href: "/collections" as const, titleKey: "archive.articles.engraving" }
] as const;

export const LANDING_SHOP_CATEGORIES = [
  {
    countKey: "shopCategories.items.earrings.count",
    image: getAssetURL("categories/earrings_alt.webp"),
    nameKey: "shopCategories.items.earrings.name",
    slug: "kolczyki"
  },
  {
    countKey: "shopCategories.items.necklaces.count",
    image: getAssetURL("categories/necklaces_alt.webp"),
    nameKey: "shopCategories.items.necklaces.name",
    slug: "naszyjniki"
  },
  {
    countKey: "shopCategories.items.bracelets.count",
    image: getAssetURL("categories/bracelets_alt.webp"),
    nameKey: "shopCategories.items.bracelets.name",
    slug: "bransoletki"
  },
  {
    countKey: "shopCategories.items.birthdayBracelets.count",
    image: getAssetURL("categories/birthday_bracelets_alt.webp"),
    nameKey: "shopCategories.items.birthdayBracelets.name",
    slug: "bransoletki-urodzinowe"
  },
  {
    countKey: "shopCategories.items.chokers.count",
    image: getAssetURL("categories/chokers_alt.webp"),
    nameKey: "shopCategories.items.chokers.name",
    slug: "chokery"
  }
] as const;

export const LANDING_SHOP_COLLECTIONS = [
  {
    descKey: "shopCollections.items.newArrivals.description",
    image: getAssetURL("collections/new_arrivals.webp"),
    nameKey: "shopCollections.items.newArrivals.name",
    slug: "nowosci"
  },
  {
    descKey: "shopCollections.items.silver.description",
    image: getAssetURL("collections/silver925.webp"),
    nameKey: "shopCollections.items.silver.name",
    slug: "srebro-925"
  },
  {
    descKey: "shopCollections.items.gold.description",
    image: getAssetURL("collections/gold585.webp"),
    nameKey: "shopCollections.items.gold.name",
    slug: "zloto-585"
  }
] as const;
