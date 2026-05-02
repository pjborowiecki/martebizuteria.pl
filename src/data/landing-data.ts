import { getAssetURL } from "~/src/lib/utils";

export const LANDING_HERO_IMG = getAssetURL("marketing/hero.webp");
export const LANDING_VIDEO_POSTER = getAssetURL("placeholder.svg");
export const LANDING_VIDEO_SRC = getAssetURL("marketing/landing-video.mp4");

export const LANDING_PRODUCTS = [
  {
    detailsKey: "items.lapis.details",
    image: getAssetURL("products/lapis_lazuli_main.webp"),
    nameKey: "items.lapis.name",
    priceKey: "items.lapis.price"
  },
  {
    detailsKey: "items.onyks.details",
    image: getAssetURL("products/onyks_main.webp"),
    nameKey: "items.onyks.name",
    priceKey: "items.onyks.price"
  },
  {
    detailsKey: "items.vintageOnyksSilver.details",
    image: getAssetURL("products/vintage_onyks_main.webp"),
    nameKey: "items.vintageOnyksSilver.name",
    priceKey: "items.vintageOnyksSilver.price"
  },
  {
    detailsKey: "items.vintageOnyksGolden.details",
    image: getAssetURL("products/vintage_onyks_golden_main.webp"),
    nameKey: "items.vintageOnyksGolden.name",
    priceKey: "items.vintageOnyksGolden.price"
  },
  {
    detailsKey: "items.ginkgo.details",
    image: getAssetURL("products/ginkgo_main.webp"),
    nameKey: "items.ginkgo.name",
    priceKey: "items.ginkgo.price"
  },
  {
    detailsKey: "items.oliwin.details",
    image: getAssetURL("products/oliwin_main.webp"),
    nameKey: "items.oliwin.name",
    priceKey: "items.oliwin.price"
  }
] as const;

export const LANDING_CATEGORY_PANELS = [
  {
    buttonTextKey: "panels.necklaces.buttonText",
    image: getAssetURL("categories/necklaces.webp"),
    subtitleKey: "panels.necklaces.subtitle",
    tagKey: "panels.necklaces.tag",
    titleKey: "panels.necklaces.title"
  },
  {
    buttonTextKey: "panels.earrings.buttonText",
    image: getAssetURL("categories/earrings.webp"),
    subtitleKey: "panels.earrings.subtitle",
    tagKey: "panels.earrings.tag",
    titleKey: "panels.earrings.title"
  },
  {
    buttonTextKey: "panels.chokers.buttonText",
    image: getAssetURL("categories/chokers.webp"),
    subtitleKey: "panels.chokers.subtitle",
    tagKey: "panels.chokers.tag",
    titleKey: "panels.chokers.title"
  },
  {
    buttonTextKey: "panels.bracelets.buttonText",
    image: getAssetURL("categories/bracelets.webp"),
    subtitleKey: "panels.bracelets.subtitle",
    tagKey: "panels.bracelets.tag",
    titleKey: "panels.bracelets.title"
  },
  {
    buttonTextKey: "panels.birthdayBracelets.buttonText",
    image: getAssetURL("categories/birthday_bracelets.webp"),
    subtitleKey: "panels.birthdayBracelets.subtitle",
    tagKey: "panels.birthdayBracelets.tag",
    titleKey: "panels.birthdayBracelets.title"
  }
] as const;

export const LANDING_ARCHIVE_ARTICLES = [
  { href: "/collections" as const, titleKey: "articles.golden" },
  { href: "/collections" as const, titleKey: "articles.sustainability" },
  { href: "/collections" as const, titleKey: "articles.engraving" }
] as const;

export const LANDING_SHOP_CATEGORIES = [
  {
    countKey: "items.earrings.count",
    image: getAssetURL("categories/earrings_alt.webp"),
    nameKey: "items.earrings.name",
    slug: "kolczyki"
  },
  {
    countKey: "items.necklaces.count",
    image: getAssetURL("categories/necklaces_alt.webp"),
    nameKey: "items.necklaces.name",
    slug: "naszyjniki"
  },
  {
    countKey: "items.bracelets.count",
    image: getAssetURL("categories/bracelets_alt.webp"),
    nameKey: "items.bracelets.name",
    slug: "bransoletki"
  },
  {
    countKey: "items.birthdayBracelets.count",
    image: getAssetURL("categories/birthday_bracelets_alt.webp"),
    nameKey: "items.birthdayBracelets.name",
    slug: "bransoletki-urodzinowe"
  },
  {
    countKey: "items.chokers.count",
    image: getAssetURL("categories/chokers_alt.webp"),
    nameKey: "items.chokers.name",
    slug: "chokery"
  }
] as const;

export const LANDING_SHOP_COLLECTIONS = [
  {
    descKey: "items.newArrivals.description",
    image: getAssetURL("collections/new_arrivals.webp"),
    nameKey: "items.newArrivals.name",
    slug: "nowosci"
  },
  {
    descKey: "items.silver.description",
    image: getAssetURL("collections/silver925.webp"),
    nameKey: "items.silver.name",
    slug: "srebro-925"
  },
  {
    descKey: "items.gold.description",
    image: getAssetURL("collections/gold585.webp"),
    nameKey: "items.gold.name",
    slug: "zloto-585"
  }
] as const;
