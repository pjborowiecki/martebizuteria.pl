import { describe, expect, it } from "vite-plus/test"

import {
  DATA_GRID_DEFAULT_PAGE_SIZE,
  DATA_GRID_PAGE_SIZE_OPTIONS,
  isDataGridPageSize,
  normalizeDataGridPageSize,
} from "~/src/presentation/components/custom/datagrid/lib/data-grid-pagination.constants"

describe("DATA_GRID_PAGE_SIZE_OPTIONS", () => {
  it("offers the page sizes in ascending order", () => {
    expect(DATA_GRID_PAGE_SIZE_OPTIONS).toStrictEqual([10, 25, 50, 100, 250])
  })

  it("defaults to the smallest offered page size", () => {
    expect(DATA_GRID_DEFAULT_PAGE_SIZE).toBe(DATA_GRID_PAGE_SIZE_OPTIONS[0])
  })
})

describe("isDataGridPageSize", () => {
  it("accepts every offered option", () => {
    expect(DATA_GRID_PAGE_SIZE_OPTIONS.every((size) => isDataGridPageSize(size))).toBe(true)
  })

  it.each([0, 1, 24, 26, 251, -10, 10.5])("rejects %d", (size) => {
    expect(isDataGridPageSize(size)).toBe(false)
  })
})

describe("normalizeDataGridPageSize", () => {
  it("keeps a size that is already offered", () => {
    expect(normalizeDataGridPageSize(50)).toBe(50)
  })

  it.each([
    [1, 10],
    [11, 25],
    [26, 50],
    [51, 100],
    [101, 250],
  ])("rounds %d up to the next offered size %d", (requested, expected) => {
    expect(normalizeDataGridPageSize(requested)).toBe(expected)
  })

  it("falls back to the largest offered size when the request exceeds every option", () => {
    expect(normalizeDataGridPageSize(1000)).toBe(250)
  })

  it("rounds a non positive request up to the smallest offered size", () => {
    expect(normalizeDataGridPageSize(0)).toBe(10)
    expect(normalizeDataGridPageSize(-5)).toBe(10)
  })
})
