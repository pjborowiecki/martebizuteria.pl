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
    detailsKey: "newArrivals.items.aurelia.details",
    image: "https://images.unsplash.com/photo-1635767798638-3e25273a8236?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.aurelia.name",
    priceKey: "newArrivals.items.aurelia.price"
  },
  {
    detailsKey: "newArrivals.items.azure.details",
    image: "https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.azure.name",
    priceKey: "newArrivals.items.azure.price"
  },
  {
    detailsKey: "newArrivals.items.heritage.details",
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.heritage.name",
    priceKey: "newArrivals.items.heritage.price"
  },
  {
    detailsKey: "newArrivals.items.pearl.details",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.pearl.name",
    priceKey: "newArrivals.items.pearl.price"
  },
  {
    detailsKey: "newArrivals.items.midnight.details",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=1200&q=80",
    nameKey: "newArrivals.items.midnight.name",
    priceKey: "newArrivals.items.midnight.price"
  }
] as const;

export const LANDING_CATEGORY_PANELS = [
  {
    descriptionKey: "categories.panels.aurora.description",
    image: "https://images.unsplash.com/photo-1588444837495-c6cfeb53ae8d?auto=format&fit=crop&w=1600&q=85",
    titleKey: "categories.panels.aurora.title"
  },
  {
    descriptionKey: "categories.panels.stone.description",
    image: "https://images.unsplash.com/photo-1617038220319-276d3cfab638?auto=format&fit=crop&w=1600&q=85",
    titleKey: "categories.panels.stone.title"
  },
  {
    descriptionKey: "categories.panels.nightfall.description",
    image: "https://images.unsplash.com/photo-1573408301185-9146fe634ad0?auto=format&fit=crop&w=1600&q=85",
    titleKey: "categories.panels.nightfall.title"
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
    slug: "kolczyki"
  },
  {
    countKey: "shopCategories.items.pendants.count",
    image: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=800&q=80",
    nameKey: "shopCategories.items.pendants.name",
    slug: "naszyjniki"
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
