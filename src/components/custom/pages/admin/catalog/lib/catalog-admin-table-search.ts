import { appendSearchPart } from "~/src/components/custom/datagrid/lib/catalog-table-global-filter";

import type { Category } from "~/src/modules/category/category.types";
import type { Collection } from "~/src/modules/collection/collection.types";

function appendDateSearchPart(parts: string[], value: Date | string | number | null | undefined): void {
  if (value === null || value === undefined || value === "") {
    return;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    return;
  }

  appendSearchPart(parts, date.toISOString());
  appendSearchPart(parts, date.toLocaleDateString());
}

export function getCategoryAdminSearchParts(row: Category["adminListItem"], statusLabel: string): string[] {
  const parts: string[] = [];

  appendSearchPart(parts, row.title);
  appendSearchPart(parts, row.handle);
  appendSearchPart(parts, row.id);
  appendSearchPart(parts, row.status);
  appendSearchPart(parts, statusLabel);
  appendSearchPart(parts, row.parentTitle);
  appendSearchPart(parts, row.subtitle);
  appendSearchPart(parts, row.shortDescription);
  appendSearchPart(parts, row.description);
  appendSearchPart(parts, row.productCount);
  appendDateSearchPart(parts, row.createdAt);
  appendDateSearchPart(parts, row.updatedAt);

  return parts;
}

export function getCollectionAdminSearchParts(row: Collection["adminListItem"], statusLabel: string): string[] {
  const parts: string[] = [];

  appendSearchPart(parts, row.title);
  appendSearchPart(parts, row.handle);
  appendSearchPart(parts, row.id);
  appendSearchPart(parts, row.status);
  appendSearchPart(parts, statusLabel);
  appendSearchPart(parts, row.description);
  appendSearchPart(parts, row.productCount);
  appendDateSearchPart(parts, row.createdAt);
  appendDateSearchPart(parts, row.updatedAt);

  return parts;
}
