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
