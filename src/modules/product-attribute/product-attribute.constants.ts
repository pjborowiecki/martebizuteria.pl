import { UUID_STRING_LENGTH } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX } from "~/src/components/custom/pages/admin/catalog/lib/catalog-admin-datagrid.constants";

export const PRODUCT_ATTRIBUTE_COLUMN_LENGTH = {
  allowedValueKey: 128,
  handle: 255,
  id: UUID_STRING_LENGTH,
  title: 255,
  unit: 64
} as const;

/** Common units for numeric attributes — quick-pick presets; admins can still enter a custom unit. */
export const PRODUCT_ATTRIBUTE_UNIT_PRESETS = ["mm", "cm", "m", "km", "mg", "g", "kg", "ml", "l", "szt.", "par", "%"] as const;

export type ProductAttributeUnitPreset = (typeof PRODUCT_ATTRIBUTE_UNIT_PRESETS)[number];

export const PRODUCT_ATTRIBUTE_UNIT_CUSTOM_SELECT_VALUE = "__custom__";

export const PRODUCT_ATTRIBUTE_TYPE = {
  BOOLEAN: "boolean",
  MULTISELECT: "multiselect",
  NUMBER: "number",
  SELECT: "select",
  TEXT: "text"
} as const;

export const PRODUCT_ATTRIBUTE_TYPES = [
  PRODUCT_ATTRIBUTE_TYPE.TEXT,
  PRODUCT_ATTRIBUTE_TYPE.NUMBER,
  PRODUCT_ATTRIBUTE_TYPE.BOOLEAN,
  PRODUCT_ATTRIBUTE_TYPE.SELECT,
  PRODUCT_ATTRIBUTE_TYPE.MULTISELECT
] as const;

export type ProductAttributeType = (typeof PRODUCT_ATTRIBUTE_TYPES)[number];

export function isProductAttributeType(value: string): value is ProductAttributeType {
  return (PRODUCT_ATTRIBUTE_TYPES as readonly string[]).includes(value);
}

export function productAttributeTypeUsesAllowedValues(type: ProductAttributeType): boolean {
  return type === PRODUCT_ATTRIBUTE_TYPE.SELECT || type === PRODUCT_ATTRIBUTE_TYPE.MULTISELECT;
}

/** Stat-card table filters (not persisted). */
export const PRODUCT_ATTRIBUTE_STAT_FILTER = {
  CHOICE: "choice",
  IN_USE: "inUse",
  UNUSED: "unused"
} as const;

export type ProductAttributeStatFilter = (typeof PRODUCT_ATTRIBUTE_STAT_FILTER)[keyof typeof PRODUCT_ATTRIBUTE_STAT_FILTER];

export const PRODUCT_ATTRIBUTE_DEFAULT_RANK = 0;

export const PRODUCT_ATTRIBUTE_HANDLE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const PRODUCT_ATTRIBUTE_ALLOWED_VALUE_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;

export const PRODUCT_ATTRIBUTE_ERROR_CODES = {
  DUPLICATE_HANDLE: "DUPLICATE_HANDLE",
  IN_USE: "IN_USE",
  UNAUTHORIZED: "UNAUTHORIZED"
} as const;

export const PRODUCT_ATTRIBUTE_FORM_VALIDATION_KEYS = {
  allowedValuesRequired: "form.validation.ALLOWED_VALUES_REQUIRED",
  handleInvalid: "form.validation.HANDLE_INVALID",
  handleRequired: "form.validation.HANDLE_REQUIRED",
  localeTitleRequired: "form.validation.LOCALE_TITLE_REQUIRED"
} as const;

export const PRODUCT_ATTRIBUTE_QUERY_STALE_MS = 60_000;

/** Default rows per page on the admin attributes (Atrybuty) datagrid. */
export const ADMIN_PRODUCT_ATTRIBUTES_PAGE_SIZE = 25;

export const PRODUCT_ATTRIBUTE_TABLE_A11Y_KEYS = {
  selectAll: "a11y.selectAll",
  selectRow: "a11y.selectRow"
} as const;

export const PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID = {
  actions: "actions",
  allowedValues: "allowedValues",
  createdAt: "createdAt",
  drag: "drag",
  editedAt: "editedAt",
  productCount: "productCount",
  recordId: "recordId",
  select: "select",
  title: "title",
  type: "type",
  unit: "unit"
} as const;

export const PRODUCT_ATTRIBUTE_TABLE_DEFAULT_COLUMN_VISIBILITY = {
  [PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.editedAt]: false,
  [PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.recordId]: false
} as const;

export const PRODUCT_ATTRIBUTE_TABLE_COLUMN_SIZE = {
  actions: 48,
  allowedValues: 240,
  createdAt: 160,
  drag: 40,
  editedAt: 160,
  productCount: 120,
  recordId: CATALOG_ADMIN_RECORD_ID_COLUMN_WIDTH_PX,
  title: 220,
  type: 200,
  unit: 120
} as const;

export const PRODUCT_ATTRIBUTE_TABLE_COLUMN_PINNING = {
  left: [PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.select, PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.drag, PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.title],
  right: [PRODUCT_ATTRIBUTE_TABLE_COLUMN_ID.actions]
};

export const PRODUCT_ATTRIBUTE_SEED_HANDLES = {
  CARE: "care",
  DIMENSIONS: "dimensions",
  MATERIALS: "materials",
  SHIPPING: "shipping"
} as const;
