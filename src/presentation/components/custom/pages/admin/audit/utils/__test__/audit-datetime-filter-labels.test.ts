import { describe, expect, it, vi } from "vite-plus/test"

import { DATE_COLUMN_FILTER_OPERATORS } from "~/src/modules/_core/utils/column-filters"

import {
  buildAuditDateTimeFilterLabels,
  buildAuditDateTimeFilterOperatorOptions,
} from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-datetime-filter-labels"

const echo = (key: string): string => key

describe("buildAuditDateTimeFilterLabels", () => {
  it("resolves every label from the audit date filter namespace", () => {
    expect(buildAuditDateTimeFilterLabels(echo)).toStrictEqual({
      apply: "audit.filter.date.apply",
      clear: "audit.filter.date.clear",
      clearDate: "audit.filter.date.clearDate",
      date: "audit.filter.date.date",
      endDate: "audit.filter.date.endDate",
      endTime: "audit.filter.date.endTime",
      operator: "audit.filter.date.operator",
      operatorAfter: "audit.filter.date.operatorAfter",
      operatorBefore: "audit.filter.date.operatorBefore",
      operatorBetween: "audit.filter.date.operatorBetween",
      operatorOn: "audit.filter.date.operatorOn",
      placeholder: "audit.filter.date.placeholder",
      startDate: "audit.filter.date.startDate",
      startTime: "audit.filter.date.startTime",
      time: "audit.filter.date.time",
      timePlaceholder: "audit.filter.date.timePlaceholder",
      today: "audit.filter.date.today",
    })
  })

  it("asks the translator once per label", () => {
    const translate = vi.fn(echo)
    const labels = buildAuditDateTimeFilterLabels(translate)

    expect(translate).toHaveBeenCalledTimes(Object.keys(labels).length)
  })
})

describe("buildAuditDateTimeFilterOperatorOptions", () => {
  it("maps each supported operator to its own label in declaration order", () => {
    const labels = buildAuditDateTimeFilterLabels((key) => `t:${key}`)

    expect(buildAuditDateTimeFilterOperatorOptions(labels)).toStrictEqual([
      { label: "t:audit.filter.date.operatorOn", value: "on" },
      { label: "t:audit.filter.date.operatorBefore", value: "before" },
      { label: "t:audit.filter.date.operatorAfter", value: "after" },
      { label: "t:audit.filter.date.operatorBetween", value: "between" },
    ])
  })

  it("produces one option per supported operator", () => {
    expect(buildAuditDateTimeFilterOperatorOptions(buildAuditDateTimeFilterLabels(echo))).toHaveLength(DATE_COLUMN_FILTER_OPERATORS.length)
  })
})
