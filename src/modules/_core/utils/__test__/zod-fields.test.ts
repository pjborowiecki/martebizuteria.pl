import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { DATE_COLUMN_FILTER_OPERATOR, NUMERIC_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"
import { LIST_PAGE_FIRST, LIST_PAGE_SIZE_MAX } from "~/src/modules/_core/utils/pagination"
import {
  dateColumnFilterField,
  dateTimeColumnFilterField,
  handleField,
  idField,
  localeField,
  numericColumnFilterField,
  pageField,
  pageSizeField,
  searchTermField,
  uuidField,
} from "~/src/modules/_core/utils/zod-fields"

describe("identifier fields", () => {
  it.each([[idField], [handleField]])("rejects an empty string", (field) => {
    expect(field.safeParse("").success).toBe(false)
  })

  it.each([[idField], [handleField]])("accepts a single character", (field) => {
    expect(field.parse("a")).toBe("a")
  })

  it("rejects a non-string id", () => {
    expect(idField.safeParse(7).success).toBe(false)
  })

  it("accepts a version 4 uuid", () => {
    expect(uuidField.parse("3f2504e0-4f89-41d3-9a0c-0305e82c3301")).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3301")
  })

  it("rejects an id that only looks like a uuid", () => {
    expect(uuidField.safeParse("3f2504e0-4f89-41d3-9a0c-0305e82c330").success).toBe(false)
  })

  it("accepts an empty search term, because an empty search is not an error", () => {
    expect(searchTermField.parse("")).toBe("")
  })
})

describe("localeField", () => {
  it.each(I18N.SUPPORTED_LOCALES.map((locale) => [locale]))("accepts the supported locale %s", (locale) => {
    expect(localeField.parse(locale)).toBe(locale)
  })

  it.each([["de-DE"], ["en"], ["pl"], ["EN-US"]])("rejects the unsupported locale %s", (locale) => {
    expect(localeField.safeParse(locale).success).toBe(false)
  })
})

describe("pagination fields", () => {
  it("accepts the first page", () => {
    expect(pageField.parse(LIST_PAGE_FIRST)).toBe(LIST_PAGE_FIRST)
  })

  it("rejects a zero-based page index", () => {
    expect(pageField.safeParse(LIST_PAGE_FIRST - 1).success).toBe(false)
  })

  it("rejects a fractional page", () => {
    expect(pageField.safeParse(1.5).success).toBe(false)
  })

  it("rejects a page size of zero", () => {
    expect(pageSizeField.safeParse(0).success).toBe(false)
  })

  it("accepts a page size of one", () => {
    expect(pageSizeField.parse(1)).toBe(1)
  })

  it("accepts the largest page the admin grids offer", () => {
    expect(pageSizeField.parse(LIST_PAGE_SIZE_MAX)).toBe(LIST_PAGE_SIZE_MAX)
  })

  it("rejects a page larger than the admin grids offer", () => {
    expect(pageSizeField.safeParse(LIST_PAGE_SIZE_MAX + 1).success).toBe(false)
  })

  it("rejects a numeric string page", () => {
    expect(pageField.safeParse("2").success).toBe(false)
  })
})

describe("dateColumnFilterField", () => {
  it("accepts a single-date filter", () => {
    expect(dateColumnFilterField.safeParse({ date: "2024-06-10", operator: DATE_COLUMN_FILTER_OPERATOR.ON }).success).toBe(true)
  })

  it("rejects a single-date filter whose date is not a calendar date", () => {
    expect(dateColumnFilterField.safeParse({ date: "2024-02-30", operator: DATE_COLUMN_FILTER_OPERATOR.ON }).success).toBe(false)
  })

  it("requires both endpoints for a range filter", () => {
    expect(dateColumnFilterField.safeParse({ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-06-01" }).success).toBe(false)
    expect(
      dateColumnFilterField.safeParse({
        endDate: "2024-06-30",
        operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN,
        startDate: "2024-06-01",
      }).success,
    ).toBe(true)
  })

  it("rejects an unknown operator", () => {
    expect(dateColumnFilterField.safeParse({ date: "2024-06-10", operator: "around" }).success).toBe(false)
  })
})

describe("numericColumnFilterField", () => {
  it("accepts a comparison filter with an amount", () => {
    expect(numericColumnFilterField.safeParse({ amountMinorUnits: 1500, operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE }).success).toBe(true)
  })

  it("rejects a comparison filter without an amount", () => {
    expect(numericColumnFilterField.safeParse({ operator: NUMERIC_COLUMN_FILTER_OPERATOR.GTE }).success).toBe(false)
  })

  it("rejects a non-finite amount", () => {
    expect(numericColumnFilterField.safeParse({ amountMinorUnits: Number.NaN, operator: NUMERIC_COLUMN_FILTER_OPERATOR.EQ }).success).toBe(
      false,
    )
  })

  it("requires both bounds for a range filter", () => {
    expect(
      numericColumnFilterField.safeParse({ operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN, startAmountMinorUnits: 100 }).success,
    ).toBe(false)
    expect(
      numericColumnFilterField.safeParse({
        endAmountMinorUnits: 900,
        operator: NUMERIC_COLUMN_FILTER_OPERATOR.BETWEEN,
        startAmountMinorUnits: 100,
      }).success,
    ).toBe(true)
  })
})

describe("dateTimeColumnFilterField", () => {
  it("accepts a filter that carries a local date and time", () => {
    expect(dateTimeColumnFilterField.safeParse({ date: "2024-06-10T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.ON }).success).toBe(true)
  })

  it("accepts a bare operator, because the shape leaves every date optional", () => {
    expect(dateTimeColumnFilterField.safeParse({ operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN }).success).toBe(true)
  })

  it("does not validate the date format, only its type", () => {
    expect(dateTimeColumnFilterField.safeParse({ date: "not-a-date", operator: DATE_COLUMN_FILTER_OPERATOR.ON }).success).toBe(true)
    expect(dateTimeColumnFilterField.safeParse({ date: 12_345, operator: DATE_COLUMN_FILTER_OPERATOR.ON }).success).toBe(false)
  })

  it("rejects an unknown operator", () => {
    expect(dateTimeColumnFilterField.safeParse({ date: "2024-06-10T08:30", operator: "around" }).success).toBe(false)
  })
})
