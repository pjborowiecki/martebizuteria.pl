export const LANDING_HERO_IMG = "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1800&q=80";
export const LANDING_VIDEO_POSTER = "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1800&q=80";
export const LANDING_VIDEO_SRC = "/video/video1.mp4";

export const LANDING_PRODUCTS = [
  {
    detailsKey: "newArrivals.items.lapis.details",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.lapis.name",
    priceKey: "newArrivals.items.lapis.price"
  },
  {
    detailsKey: "newArrivals.items.onyks.details",
    image: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.onyks.name",
    priceKey: "newArrivals.items.onyks.price"
  },
  {
    detailsKey: "newArrivals.items.vintageOnyksSilver.details",
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.vintageOnyksSilver.name",
    priceKey: "newArrivals.items.vintageOnyksSilver.price"
  },
  {
    detailsKey: "newArrivals.items.vintageOnyksGolden.details",
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.vintageOnyksGolden.name",
    priceKey: "newArrivals.items.vintageOnyksGolden.price"
  },
  {
    detailsKey: "newArrivals.items.ginkgo.details",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.ginkgo.name",
    priceKey: "newArrivals.items.ginkgo.price"
  },
  {
    detailsKey: "newArrivals.items.oliwin.details",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.oliwin.name",
    priceKey: "newArrivals.items.oliwin.price"
  }
] as const;

export const LANDING_CATEGORY_PANELS = [
  {
    buttonTextKey: "categories.panels.necklaces.buttonText",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=1600&q=85",
    subtitleKey: "categories.panels.necklaces.subtitle",
    tagKey: "categories.panels.necklaces.tag",
    titleKey: "categories.panels.necklaces.title"
  },
  {
    buttonTextKey: "categories.panels.earrings.buttonText",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=1600&q=85",
    subtitleKey: "categories.panels.earrings.subtitle",
    tagKey: "categories.panels.earrings.tag",
    titleKey: "categories.panels.earrings.title"
  },
  {
    buttonTextKey: "categories.panels.chokers.buttonText",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1600&q=85",
    subtitleKey: "categories.panels.chokers.subtitle",
    tagKey: "categories.panels.chokers.tag",
    titleKey: "categories.panels.chokers.title"
  },
  {
    buttonTextKey: "categories.panels.bracelets.buttonText",
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1600&q=85",
    subtitleKey: "categories.panels.bracelets.subtitle",
    tagKey: "categories.panels.bracelets.tag",
    titleKey: "categories.panels.bracelets.title"
  },
  {
    buttonTextKey: "categories.panels.birthdayBracelets.buttonText",
    image: "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=1600&q=85",
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

export type LandingArchiveArticle = (typeof LANDING_ARCHIVE_ARTICLES)[number];

export const LANDING_SHOP_CATEGORIES = [
  {
    countKey: "shopCategories.items.earrings.count",
    image: "https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=800&q=80",
    nameKey: "shopCategories.items.earrings.name",
    slug: "kolczyki"
  },
  {
    countKey: "shopCategories.items.necklaces.count",
    image: "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?auto=format&fit=crop&w=800&q=80",
    nameKey: "shopCategories.items.necklaces.name",
    slug: "naszyjniki"
  },
  {
    countKey: "shopCategories.items.bracelets.count",
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=800&q=80",
    nameKey: "shopCategories.items.bracelets.name",
    slug: "bransoletki"
  },
  {
    countKey: "shopCategories.items.rings.count",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?auto=format&fit=crop&w=800&q=80",
    nameKey: "shopCategories.items.rings.name",
    slug: "pierscionki"
  },
  {
    countKey: "shopCategories.items.chokers.count",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=800&q=80",
    nameKey: "shopCategories.items.chokers.name",
    slug: "chokery"
  },
  {
    countKey: "shopCategories.items.birthdayBracelets.count",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
    nameKey: "shopCategories.items.birthdayBracelets.name",
    slug: "bransoletki-urodzinowe"
  }
] as const;

export const LANDING_SHOP_COLLECTIONS = [
  {
    descKey: "shopCollections.items.newArrivals.description",
    image: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=1200&q=80",
    nameKey: "shopCollections.items.newArrivals.name",
    slug: "nowosci"
  },
  {
    descKey: "shopCollections.items.bestsellers.description",
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=80",
    nameKey: "shopCollections.items.bestsellers.name",
    slug: "bestsellery"
  },
  {
    descKey: "shopCollections.items.gifts.description",
    image: "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=1200&q=80",
    nameKey: "shopCollections.items.gifts.name",
    slug: "prezenty"
  }
] as const;

export const LANDING_GALLERY_IMAGES = [
  {
    altKey: "gallery.items.ritual",
    image: "https://images.unsplash.com/photo-1601821765780-754fa98637c1?auto=format&fit=crop&w=1400&q=80"
  },
  {
    altKey: "gallery.items.stone",
    image: "https://images.unsplash.com/photo-1589128777073-263566ae5e4d?auto=format&fit=crop&w=1400&q=80"
  },
  {
    altKey: "gallery.items.signature",
    image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1400&q=80"
  }
] as const;

const sc = LANDING_SHOP_CATEGORIES;

const INDEX_EARRINGS = 0;
const INDEX_NECKLACES = 1;
const INDEX_BRACELETS = 2;
const INDEX_RINGS = 3;
const INDEX_CHOKERS = 4;
const INDEX_PENDANTS = 5;

/** Row / grid slot order matches the reference landing layout */
export const LANDING_SHOP_CATEGORY_SLOTS = {
  bracelets: sc[INDEX_BRACELETS],
  chokers: sc[INDEX_CHOKERS],
  earrings: sc[INDEX_EARRINGS],
  necklaces: sc[INDEX_NECKLACES],
  pendants: sc[INDEX_PENDANTS],
  rings: sc[INDEX_RINGS]
} as const;
