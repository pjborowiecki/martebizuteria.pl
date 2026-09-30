import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX } from "~/src/presentation/components/custom/pages/admin/catalog/lib/catalog-admin-datagrid.constants"

export const COLLECTION_COLUMN_LENGTH = {
  description: 1024,
  handle: 255,
  id: UUID_STRING_LENGTH,
  image: 2048,
  title: 255,
} as const

export const COLLECTION_MIN_LENGTH = 1

export const COLLECTION_DEFAULT_RANK = 0

export const COLLECTION_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u

export const COLLECTION_STATUS = {
  ACTIVE: "active",
  DRAFT: "draft",
} as const

export const COLLECTION_STATUSES = [COLLECTION_STATUS.DRAFT, COLLECTION_STATUS.ACTIVE] as const

export type CollectionStatus = (typeof COLLECTION_STATUSES)[number]

export const DEFAULT_COLLECTION_STATUS: CollectionStatus = COLLECTION_STATUS.DRAFT

export const COLLECTION_ERROR_CODES = {
  DUPLICATE_HANDLE: "DUPLICATE_HANDLE",
  HAS_PRODUCTS: "HAS_PRODUCTS",
  UNAUTHORIZED: "UNAUTHORIZED",
} as const

export const COLLECTION_FORM_VALIDATION_KEYS = {
  descriptionTooLong: "form.validation.descriptionTooLong",
  localeTitleRequired: "form.validation.LOCALE_TITLE_REQUIRED",
  nameRequired: "form.validation.nameRequired",
  nameTooLong: "form.validation.nameTooLong",
  slugInvalid: "form.validation.slugInvalid",
  slugRequired: "form.validation.slugRequired",
} as const

export const COLLECTION_STATUS_LABEL_KEYS: Record<CollectionStatus, string> = {
  active: "statusActive",
  draft: "statusDraft",
}

export const COLLECTION_TABLE_A11Y_KEYS = {
  selectAll: "a11y.selectAll",
  selectRow: "a11y.selectRow",
} as const

export const COLLECTION_TABLE_COLUMN_ID = {
  actions: "actions",
  createdAt: "createdAt",
  description: "description",
  drag: "drag",
  editedAt: "editedAt",
  image: "image",
  productCount: "productCount",
  recordId: "recordId",
  select: "select",
  status: "status",
  title: "title",
} as const

export const COLLECTION_TABLE_DEFAULT_COLUMN_VISIBILITY = {
  [COLLECTION_TABLE_COLUMN_ID.editedAt]: false,
  [COLLECTION_TABLE_COLUMN_ID.recordId]: false,
} as const

export const COLLECTION_TABLE_COLUMN_SIZE = {
  actions: 48,
  createdAt: 160,
  description: 360,
  drag: 40,
  editedAt: 160,
  image: 72,
  productCount: 120,
  recordId: CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX,
  status: 120,
  title: 200,
} as const

export const COLLECTION_TABLE_COLUMN_PINNING = {
  end: [COLLECTION_TABLE_COLUMN_ID.actions],
  start: [
    COLLECTION_TABLE_COLUMN_ID.select,
    COLLECTION_TABLE_COLUMN_ID.drag,
    COLLECTION_TABLE_COLUMN_ID.image,
    COLLECTION_TABLE_COLUMN_ID.title,
  ],
}

export const COLLECTION_QUERY_STALE_MS = 60_000

export const COLLECTION_QUERY_KEYS = {
  ADMIN: {
    ALL: ["admin", "collections"] as const,
    STATS: ["admin", "collections", "stats"] as const,
  },
  ALL: ["collections"] as const,
  BY_HANDLE: ["collection"] as const,
} as const

export const COLLECTION_MUTATION_KEYS = {
  DELETE: ["product-collection", "deleteCollections"] as const,
  REORDER: ["product-collection", "reorderCollections"] as const,
} as const
