export const COLLECTION_COLUMN_LENGTH = {
  description: 1024,
  handle: 255,
  image: 2048,
  title: 255
} as const;

export const COLLECTION_MIN_LENGTH = 1;

export const COLLECTION_DEFAULT_RANK = 0;

export const COLLECTION_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const COLLECTION_STATUS = {
  ACTIVE: "active",
  DRAFT: "draft"
} as const;

export const COLLECTION_STATUSES = [COLLECTION_STATUS.DRAFT, COLLECTION_STATUS.ACTIVE] as const;

export type CollectionStatus = (typeof COLLECTION_STATUSES)[number];

export const DEFAULT_COLLECTION_STATUS: CollectionStatus = COLLECTION_STATUS.DRAFT;

export const COLLECTION_ERROR_CODES = {
  DUPLICATE_HANDLE: "DUPLICATE_HANDLE",
  UNAUTHORIZED: "UNAUTHORIZED"
} as const;

export const COLLECTION_FORM_VALIDATION_KEYS = {
  descriptionTooLong: "collections.form.validation.descriptionTooLong",
  nameRequired: "collections.form.validation.nameRequired",
  nameTooLong: "collections.form.validation.nameTooLong",
  slugInvalid: "collections.form.validation.slugInvalid",
  slugRequired: "collections.form.validation.slugRequired"
} as const;

export const COLLECTION_STATUS_LABEL_KEYS: Record<CollectionStatus, string> = {
  active: "collections.statusActive",
  draft: "collections.statusDraft"
};

export const COLLECTION_TABLE_A11Y_KEYS = {
  selectAll: "a11y.selectAll",
  selectRow: "a11y.selectRow"
} as const;

export const COLLECTION_TABLE_COLUMN_ID = {
  actions: "actions",
  createdAt: "createdAt",
  description: "description",
  drag: "drag",
  image: "image",
  productCount: "productCount",
  select: "select",
  status: "status",
  title: "title"
} as const;

export const COLLECTION_TABLE_COLUMN_SIZE = {
  actions: 48,
  createdAt: 160,
  description: 360,
  drag: 40,
  image: 60,
  productCount: 120,
  status: 140,
  title: 260
} as const;

export const COLLECTION_TABLE_COLUMN_PINNING = {
  left: [COLLECTION_TABLE_COLUMN_ID.select, COLLECTION_TABLE_COLUMN_ID.drag],
  right: [COLLECTION_TABLE_COLUMN_ID.actions]
} as const;

export const COLLECTION_QUERY_STALE_MS = 60_000;
