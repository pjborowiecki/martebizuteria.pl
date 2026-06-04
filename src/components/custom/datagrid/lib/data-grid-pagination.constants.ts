const DATA_GRID_PAGE_SIZE_SM = 10;
const DATA_GRID_PAGE_SIZE_MD = 25;
const DATA_GRID_PAGE_SIZE_LG = 50;
const DATA_GRID_PAGE_SIZE_XL = 100;
const DATA_GRID_PAGE_SIZE_XXL = 250;
const DATA_GRID_PAGE_SIZE_OPTIONS_LAST_INDEX = -1;

/** Allowed rows-per-page values for all datagrid tables. */
export const DATA_GRID_PAGE_SIZE_OPTIONS = [
  DATA_GRID_PAGE_SIZE_SM,
  DATA_GRID_PAGE_SIZE_MD,
  DATA_GRID_PAGE_SIZE_LG,
  DATA_GRID_PAGE_SIZE_XL,
  DATA_GRID_PAGE_SIZE_XXL
] as const;

export type DataGridPageSize = (typeof DATA_GRID_PAGE_SIZE_OPTIONS)[number];

export const DATA_GRID_DEFAULT_PAGE_SIZE: DataGridPageSize = DATA_GRID_PAGE_SIZE_SM;

export function isDataGridPageSize(value: number): value is DataGridPageSize {
  return (DATA_GRID_PAGE_SIZE_OPTIONS as readonly number[]).includes(value);
}

/** Snaps legacy or invalid page sizes to the nearest allowed option. */
export function normalizeDataGridPageSize(pageSize: number): DataGridPageSize {
  if (isDataGridPageSize(pageSize)) {
    return pageSize;
  }

  const nextLarger = DATA_GRID_PAGE_SIZE_OPTIONS.find((size) => size >= pageSize);
  const fallback = DATA_GRID_PAGE_SIZE_OPTIONS.at(DATA_GRID_PAGE_SIZE_OPTIONS_LAST_INDEX);

  return nextLarger ?? fallback ?? DATA_GRID_DEFAULT_PAGE_SIZE;
}
