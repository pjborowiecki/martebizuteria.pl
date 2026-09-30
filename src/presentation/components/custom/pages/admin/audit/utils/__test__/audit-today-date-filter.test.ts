import { describe, expect, it } from "vite-plus/test"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"

import {
  buildAuditTodayCreatedAtFilter,
  isAuditTodayCreatedAtFilter,
} from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-today-date-filter"

const REFERENCE = new Date(2024, 4, 9, 13, 45)

describe("buildAuditTodayCreatedAtFilter", () => {
  it("builds an ON filter for the local calendar date of the reference", () => {
    expect(buildAuditTodayCreatedAtFilter(REFERENCE)).toStrictEqual({
      date: "2024-05-09",
      operator: DATE_COLUMN_FILTER_OPERATOR.ON,
    })
  })

  it("pads single digit months and days", () => {
    expect(buildAuditTodayCreatedAtFilter(new Date(2024, 0, 3)).date).toBe("2024-01-03")
  })

  it("defaults to the current date", () => {
    const built = buildAuditTodayCreatedAtFilter()

    expect(isAuditTodayCreatedAtFilter(built)).toBe(true)
  })
})

describe("isAuditTodayCreatedAtFilter", () => {
  it("accepts the filter it builds for the same reference", () => {
    expect(isAuditTodayCreatedAtFilter(buildAuditTodayCreatedAtFilter(REFERENCE), REFERENCE)).toBe(true)
  })

  it("accepts an ON filter carrying a time component on the same day", () => {
    expect(isAuditTodayCreatedAtFilter({ date: "2024-05-09T08:30", operator: DATE_COLUMN_FILTER_OPERATOR.ON }, REFERENCE)).toBe(true)
  })

  it("rejects an undefined filter", () => {
    expect(isAuditTodayCreatedAtFilter(undefined, REFERENCE)).toBe(false)
  })

  it("rejects an ON filter for a different day", () => {
    expect(isAuditTodayCreatedAtFilter({ date: "2024-05-08", operator: DATE_COLUMN_FILTER_OPERATOR.ON }, REFERENCE)).toBe(false)
  })

  it("rejects operators other than ON", () => {
    expect(isAuditTodayCreatedAtFilter({ date: "2024-05-09", operator: DATE_COLUMN_FILTER_OPERATOR.AFTER }, REFERENCE)).toBe(false)
    expect(isAuditTodayCreatedAtFilter({ date: "2024-05-09", operator: DATE_COLUMN_FILTER_OPERATOR.BEFORE }, REFERENCE)).toBe(false)
  })

  it("rejects a BETWEEN filter that has no single date", () => {
    expect(
      isAuditTodayCreatedAtFilter(
        { endDate: "2024-05-09", operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: "2024-05-09" },
        REFERENCE,
      ),
    ).toBe(false)
  })

  it("rejects an ON filter with no date", () => {
    expect(isAuditTodayCreatedAtFilter({ operator: DATE_COLUMN_FILTER_OPERATOR.ON }, REFERENCE)).toBe(false)
  })
})
