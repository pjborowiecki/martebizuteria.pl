import type { FilterFn, Row } from "@tanstack/react-table";

type CatalogTableSearchPart = string | number | null | undefined;

function normalizeSearchQuery(value: unknown): string {
  if (typeof value === "string") {
    return value.trim().toLowerCase();
  }

  if (typeof value === "number" && !Number.isNaN(value)) {
    return String(value).trim().toLowerCase();
  }

  return "";
}

function appendSearchPart(parts: string[], value: CatalogTableSearchPart): void {
  if (value === null || value === undefined || value === "") {
    return;
  }

  parts.push(String(value));
}

export function rowMatchesCatalogTableSearch(parts: CatalogTableSearchPart[], filterValue: unknown): boolean {
  const query = normalizeSearchQuery(filterValue);
  if (query === "") {
    return true;
  }

  const haystack = parts.map((part) => String(part).toLowerCase()).join(" ");
  return haystack.includes(query);
}

export function createCatalogTableGlobalFilterFn<TData>(getSearchableParts: (row: TData) => CatalogTableSearchPart[]): FilterFn<TData> {
  return (row: Row<TData>, _columnId: string, filterValue: unknown) =>
    rowMatchesCatalogTableSearch(getSearchableParts(row.original), filterValue);
}

export { appendSearchPart };
