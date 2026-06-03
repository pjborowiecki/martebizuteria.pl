import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils";

export const CATEGORY_COLUMN_LENGTH = {
  description: 1024,
  handle: 255,
  id: UUID_STRING_LENGTH,
  image: 2048,
  parentId: UUID_STRING_LENGTH,
  shortDescription: 500,
  subtitle: 512,
  title: 255
} as const;

export const CATEGORY_MIN_LENGTH = 1;

export const CATEGORY_DEFAULT_RANK = 0;

export const CATEGORY_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const CATEGORY_STATUS = {
  ACTIVE: "active",
  DRAFT: "draft"
} as const;

export const CATEGORY_STATUSES = [CATEGORY_STATUS.DRAFT, CATEGORY_STATUS.ACTIVE] as const;

export type CategoryStatus = (typeof CATEGORY_STATUSES)[number];

export const DEFAULT_CATEGORY_STATUS: CategoryStatus = CATEGORY_STATUS.DRAFT;

export const CATEGORY_ERROR_CODES = {
  DUPLICATE_HANDLE: "DUPLICATE_HANDLE",
  HAS_CHILDREN: "HAS_CHILDREN",
  HAS_PRODUCTS: "HAS_PRODUCTS",
  INVALID_PARENT: "INVALID_PARENT",
  UNAUTHORIZED: "UNAUTHORIZED"
} as const;

export const CATEGORY_FORM_VALIDATION_KEYS = {
  descriptionTooLong: "categories.form.validation.descriptionTooLong",
  shortDescriptionTooLong: "categories.form.validation.shortDescriptionTooLong",
  slugInvalid: "categories.form.validation.slugInvalid",
  slugRequired: "categories.form.validation.slugRequired",
  subtitleTooLong: "categories.form.validation.subtitleTooLong",
  titleRequired: "categories.form.validation.titleRequired",
  titleTooLong: "categories.form.validation.titleTooLong"
} as const;

export const CATEGORY_STATUS_LABEL_KEYS: Record<CategoryStatus, string> = {
  active: "categories.statusActive",
  draft: "categories.statusDraft"
};

export const CATEGORY_TABLE_A11Y_KEYS = {
  selectAll: "a11y.selectAll",
  selectRow: "a11y.selectRow"
} as const;

export const CATEGORY_TABLE_COLUMN_ID = {
  actions: "actions",
  createdAt: "createdAt",
  description: "description",
  drag: "drag",
  editedAt: "editedAt",
  handle: "handle",
  image: "image",
  parent: "parent",
  productCount: "productCount",
  recordId: "recordId",
  select: "select",
  shortDescription: "shortDescription",
  status: "status",
  subtitle: "subtitle",
  title: "title"
} as const;

export const CATEGORY_TABLE_DEFAULT_COLUMN_VISIBILITY = {
  [CATEGORY_TABLE_COLUMN_ID.editedAt]: false,
  [CATEGORY_TABLE_COLUMN_ID.recordId]: false
} as const;

export const CATEGORY_TABLE_COLUMN_SIZE = {
  actions: 48,
  createdAt: 160,
  description: 280,
  drag: 40,
  editedAt: 160,
  handle: 160,
  image: 72,
  parent: 180,
  productCount: 120,
  recordId: 320,
  shortDescription: 220,
  status: 140,
  subtitle: 200,
  title: 200
} as const;

export const CATEGORY_TABLE_COLUMN_PINNING = {
  left: [CATEGORY_TABLE_COLUMN_ID.select, CATEGORY_TABLE_COLUMN_ID.drag],
  right: [CATEGORY_TABLE_COLUMN_ID.actions]
};

export const CATEGORY_QUERY_STALE_MS = 60_000;
