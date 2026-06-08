import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils";

export const PRODUCT_COLUMN_LENGTH = {
  description: 1024,
  handle: 255,
  id: UUID_STRING_LENGTH,
  optionTitle: 255,
  optionValue: 255,
  sku: 255,
  subtitle: 512,
  tag: 128,
  thumbnail: 2048,
  title: 512
} as const;

export const PRODUCT_MIN_LENGTH = 1;

export const PRODUCT_DEFAULT_RANK = 0;

export const PRODUCT_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const PRODUCT_STATUS = {
  ARCHIVED: "archived",
  DRAFT: "draft",
  PUBLISHED: "published"
} as const;

export const PRODUCT_STATUSES = [PRODUCT_STATUS.DRAFT, PRODUCT_STATUS.PUBLISHED, PRODUCT_STATUS.ARCHIVED] as const;

export type ProductStatus = (typeof PRODUCT_STATUSES)[number];

export const DEFAULT_PRODUCT_STATUS: ProductStatus = PRODUCT_STATUS.DRAFT;

/** Default page size for storefront product listings on category/collection pages. */
export const PRODUCT_STOREFRONT_LIST_LIMIT = 20;

/** Products catalog (/products): items per infinite-scroll page (3-column grid). */
export const PRODUCT_STOREFRONT_CATALOG_PAGE_SIZE = 12;

/** Max products returned when catalog filters are active (no infinite scroll). */
export const PRODUCT_STOREFRONT_FILTERED_MAX = 100;

export const LANDING_NEW_ARRIVALS_COLLECTION_HANDLE = "nowosci";

export const LANDING_NEW_ARRIVALS_PRODUCT_LIMIT = 9;

/** Default page size for the admin products data grid (server-side pagination). */
export const ADMIN_PRODUCTS_PAGE_SIZE = 25;

/** Published products with total stock in (0, threshold] count as low stock. */
export const PRODUCT_LOW_STOCK_THRESHOLD = 10;

export const PRODUCT_INVENTORY_LEVEL = {
  LOW: "low",
  OK: "ok",
  OUT: "out"
} as const;

export type ProductInventoryLevel = (typeof PRODUCT_INVENTORY_LEVEL)[keyof typeof PRODUCT_INVENTORY_LEVEL];

/** Admin list: one sellable variant vs multiple variant rows. */
export const PRODUCT_VARIANT_KIND = {
  MULTI: "multi",
  SINGLE: "single"
} as const;

export type ProductVariantKind = (typeof PRODUCT_VARIANT_KIND)[keyof typeof PRODUCT_VARIANT_KIND];

export const PRODUCT_MULTI_VARIANT_COUNT_THRESHOLD = 1;

export const PRODUCT_ERROR_CODES = {
  DUPLICATE_HANDLE: "DUPLICATE_HANDLE",
  DUPLICATE_SKU: "DUPLICATE_SKU",
  UNAUTHORIZED: "UNAUTHORIZED"
} as const;

export const PRODUCT_FORM_VALIDATION_KEYS = {
  activePriceRequired: "form.validation.activePriceRequired",
  compareAtInvalid: "form.validation.compareAtInvalid",
  descriptionTooLong: "form.validation.descriptionTooLong",
  duplicateAttribute: "form.validation.duplicateAttribute",
  duplicateSku: "form.validation.duplicateSku",
  localeTitleRequired: "form.validation.LOCALE_TITLE_REQUIRED",
  optionsRequired: "form.validation.optionsRequired",
  priceInvalid: "form.validation.priceInvalid",
  priceRequired: "form.validation.priceRequired",
  primaryCategoryRequired: "organization.validation.primaryCategoryRequired",
  simpleVariantRequired: "form.validation.simpleVariantRequired",
  slugInvalid: "form.validation.slugInvalid",
  slugRequired: "form.validation.slugRequired",
  slugTooLong: "form.validation.slugTooLong",
  subtitleTooLong: "form.validation.subtitleTooLong",
  titleRequired: "form.validation.titleRequired",
  titleTooLong: "form.validation.titleTooLong",
  variantsRequired: "form.validation.variantsRequired"
} as const;

export const PRODUCT_ADMIN_STATUS = {
  ACTIVE: "active",
  ARCHIVED: "archived",
  DRAFT: "draft"
} as const;

export type ProductAdminStatus = (typeof PRODUCT_ADMIN_STATUS)[keyof typeof PRODUCT_ADMIN_STATUS];

export const PRODUCT_STATUS_LABEL_KEYS: Record<ProductStatus, string> = {
  archived: "statusArchived",
  draft: "statusDraft",
  published: "statusActive"
};

export const PRODUCT_TABLE_A11Y_KEYS = {
  selectAll: "a11y.selectAll",
  selectRow: "a11y.selectRow"
} as const;

export const PRODUCT_TABLE_COLUMN_ID = {
  actions: "actions",
  attributes: "attributes",
  category: "category",
  collection: "collection",
  createdAt: "createdAt",
  drag: "drag",
  editedAt: "editedAt",
  handle: "handle",
  image: "image",
  minPrice: "minPrice",
  recordId: "recordId",
  select: "select",
  sku: "sku",
  status: "status",
  stock: "stock",
  title: "title",
  variantCount: "variantCount",
  variantKind: "variantKind"
} as const;

export const PRODUCT_TABLE_DEFAULT_COLUMN_VISIBILITY = {
  [PRODUCT_TABLE_COLUMN_ID.editedAt]: false,
  [PRODUCT_TABLE_COLUMN_ID.recordId]: false
} as const;

export const PRODUCT_TABLE_COLUMN_SIZE = {
  actions: 48,
  attributes: 280,
  category: 160,
  collection: 160,
  createdAt: 160,
  drag: 40,
  editedAt: 160,
  handle: 160,
  image: 72,
  minPrice: 120,
  recordId: 320,
  sku: 148,
  status: 140,
  stock: 132,
  title: 220,
  variantCount: 100,
  variantKind: 132
} as const;

export const PRODUCT_TABLE_COLUMN_PINNING = {
  left: [PRODUCT_TABLE_COLUMN_ID.select, PRODUCT_TABLE_COLUMN_ID.drag, PRODUCT_TABLE_COLUMN_ID.image, PRODUCT_TABLE_COLUMN_ID.title],
  right: [PRODUCT_TABLE_COLUMN_ID.actions]
};

export const PRODUCT_QUERY_STALE_MS = 60_000;
