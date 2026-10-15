import { describe, expect, it } from "vite-plus/test"

import { DATE_COLUMN_FILTER_OPERATOR } from "~/src/modules/_core/utils/column-filters"

import {
  AUDIT_STAT_CARDS,
  type AuditStatCardConfig,
  type AuditStatKey,
} from "~/src/presentation/components/custom/pages/admin/audit/audit-stats.config"
import {
  ALL_AUDIT_EVENTS_FILTERS,
  buildAuditStatCardFilters,
  isAuditStatCardFilterActive,
} from "~/src/presentation/components/custom/pages/admin/audit/utils/audit-stat-card-filters"

const TODAY = "2026-10-15"

const configFor = (key: AuditStatKey): AuditStatCardConfig => AUDIT_STAT_CARDS.find((card) => card.key === key)!

const activeCards = (active: Parameters<typeof isAuditStatCardFilterActive>[1]): AuditStatKey[] =>
  AUDIT_STAT_CARDS.filter((config) => isAuditStatCardFilterActive(buildAuditStatCardFilters(config, TODAY), active)).map(
    (config) => config.key,
  )

describe("buildAuditStatCardFilters", () => {
  it.each([
    ["total", { createdAt: undefined, severity: undefined }],
    ["today", { createdAt: { date: TODAY, operator: DATE_COLUMN_FILTER_OPERATOR.ON }, severity: undefined }],
    ["warnings", { createdAt: undefined, severity: "warning" }],
    ["errors", { createdAt: undefined, severity: "error" }],
  ] as const)("sets both the date and the status for the %s card, so it replaces the other cards' filters", (key, expected) => {
    expect(buildAuditStatCardFilters(configFor(key), TODAY)).toStrictEqual(expected)
  })

  it("filters the total card down to nothing", () => {
    expect(buildAuditStatCardFilters(configFor("total"), TODAY)).toStrictEqual(ALL_AUDIT_EVENTS_FILTERS)
  })
})

describe("isAuditStatCardFilterActive", () => {
  it("presses only the total card while nothing is filtered", () => {
    expect(activeCards(ALL_AUDIT_EVENTS_FILTERS)).toStrictEqual(["total"])
  })

  it.each(["today", "warnings", "errors"] as const)("presses only the %s card while its own filter is applied", (key) => {
    const cardFilters = buildAuditStatCardFilters(configFor(key), TODAY)

    expect(activeCards(cardFilters)).toStrictEqual([key])
  })

  it("presses no card while today's warnings are shown, because no card counts them", () => {
    expect(activeCards({ createdAt: { date: TODAY, operator: DATE_COLUMN_FILTER_OPERATOR.ON }, severity: "warning" })).toStrictEqual([])
  })

  it.each([
    ["another day", { date: "2026-10-14", operator: DATE_COLUMN_FILTER_OPERATOR.ON }],
    ["one minute of today", { date: `${TODAY}T00:00`, operator: DATE_COLUMN_FILTER_OPERATOR.ON }],
    ["everything after today began", { date: TODAY, operator: DATE_COLUMN_FILTER_OPERATOR.AFTER }],
    ["a range covering today", { endDate: `${TODAY}T23:59`, operator: DATE_COLUMN_FILTER_OPERATOR.BETWEEN, startDate: `${TODAY}T00:00` }],
  ] as const)("presses no card while the date filter shows %s", (_label, createdAt) => {
    expect(activeCards({ createdAt, severity: undefined })).toStrictEqual([])
  })

  it("stops pressing the today card once the day it filtered on is over", () => {
    const yesterdaysFilter = buildAuditStatCardFilters(configFor("today"), "2026-10-14")

    expect(activeCards(yesterdaysFilter)).toStrictEqual([])
  })
})
