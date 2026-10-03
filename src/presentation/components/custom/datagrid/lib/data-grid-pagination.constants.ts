import { LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"

const DATA_GRID_PAGE_SIZE_SM = 10

const DATA_GRID_PAGE_SIZE_MD = 25

const DATA_GRID_PAGE_SIZE_LG = 50

const DATA_GRID_PAGE_SIZE_XL = 100

const DATA_GRID_PAGE_SIZE_XXL = LIST_PAGE_SIZE_MAX

export const DATA_GRID_PAGE_SIZE_OPTIONS = [
  DATA_GRID_PAGE_SIZE_SM,
  DATA_GRID_PAGE_SIZE_MD,
  DATA_GRID_PAGE_SIZE_LG,
  DATA_GRID_PAGE_SIZE_XL,
  DATA_GRID_PAGE_SIZE_XXL,
] as const

export type DataGridPageSize = (typeof DATA_GRID_PAGE_SIZE_OPTIONS)[number]

export const DATA_GRID_DEFAULT_PAGE_SIZE: DataGridPageSize = DATA_GRID_PAGE_SIZE_SM

export const isDataGridPageSize = (value: number): value is DataGridPageSize =>
  (DATA_GRID_PAGE_SIZE_OPTIONS as readonly number[]).includes(value)

export const normalizeDataGridPageSize = (pageSize: number): DataGridPageSize => {
  if (isDataGridPageSize(pageSize)) {
    return pageSize
  }

  const nextLarger = DATA_GRID_PAGE_SIZE_OPTIONS.find((size) => size >= pageSize)

  return nextLarger ?? DATA_GRID_PAGE_SIZE_XXL
}
