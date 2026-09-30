import { describe, expect, it } from "vite-plus/test"

import {
  LIST_PAGE_FIRST,
  buildListPaginationResult,
  listPaginationParamsFromPage,
  sortRowsByIdOrder,
} from "~/src/modules/_core/utils/pagination"

describe("buildListPaginationResult", () => {
  it("reports more pages while the window ends before the total", () => {
    expect(buildListPaginationResult([1, 2], 10, { limit: 2, offset: 0 })).toStrictEqual({
      hasMore: true,
      items: [1, 2],
      limit: 2,
      offset: 0,
      total: 10,
    })
  })

  it("stops reporting more once the window reaches the total", () => {
    expect(buildListPaginationResult([9, 10], 10, { limit: 2, offset: 8 }).hasMore).toBe(false)
  })

  it("stops reporting more on a short final page", () => {
    expect(buildListPaginationResult([9], 9, { limit: 2, offset: 8 }).hasMore).toBe(false)
  })

  it("stops reporting more for an empty result", () => {
    expect(buildListPaginationResult([], 0, { limit: 25, offset: 0 }).hasMore).toBe(false)
  })

  it("does not claim more pages when a stale offset overshoots the total", () => {
    expect(buildListPaginationResult([], 10, { limit: 25, offset: 100 }).hasMore).toBe(false)
  })
})

describe("listPaginationParamsFromPage", () => {
  it.each([
    [1, 0],
    [2, 25],
    [4, 75],
  ])("turns page %i into offset %i", (page, offset) => {
    expect(listPaginationParamsFromPage(page, 25)).toStrictEqual({ limit: 25, offset })
  })

  it.each([[0], [-3]])("clamps the out-of-range page %i to the first page", (page) => {
    expect(listPaginationParamsFromPage(page, 25)).toStrictEqual(listPaginationParamsFromPage(LIST_PAGE_FIRST, 25))
  })
})

describe("sortRowsByIdOrder", () => {
  it("restores the order the ids were requested in", () => {
    const rows = [{ id: "c" }, { id: "a" }, { id: "b" }]

    expect(sortRowsByIdOrder(rows, ["a", "b", "c"]).map((row) => row.id)).toStrictEqual(["a", "b", "c"])
  })

  it("leaves the caller's array untouched", () => {
    const rows = [{ id: "c" }, { id: "a" }]
    sortRowsByIdOrder(rows, ["a", "c"])

    expect(rows.map((row) => row.id)).toStrictEqual(["c", "a"])
  })

  it("keeps rows whose id was not requested at the front in their original order", () => {
    const rows = [{ id: "b" }, { id: "unknown" }, { id: "a" }]

    expect(sortRowsByIdOrder(rows, ["a", "b"]).map((row) => row.id)).toStrictEqual(["unknown", "a", "b"])
  })
})
