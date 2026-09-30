import { describe, expect, it } from "vite-plus/test"

import { adminDashboardZodSchemas } from "~/src/modules/admin-dashboard/admin-dashboard.zod"

describe("snapshotInput", () => {
  it("requires the locale the snapshot should be localized in", () => {
    expect(adminDashboardZodSchemas.snapshotInput.safeParse({}).success).toBe(false)
  })

  it("keeps the locale it was given and drops anything else", () => {
    expect(adminDashboardZodSchemas.snapshotInput.parse({ extra: true, locale: "en-US" })).toStrictEqual({ locale: "en-US" })
  })

  it("refuses a locale that is not a string", () => {
    expect(adminDashboardZodSchemas.snapshotInput.safeParse({ locale: 1 }).success).toBe(false)
  })
})

describe("chartRangeInput", () => {
  it("requires both ends of the range alongside the locale", () => {
    const result = adminDashboardZodSchemas.chartRangeInput.safeParse({ locale: "en-US" })
    const paths = result.success ? [] : result.error.issues.map((issue) => issue.path.join("."))

    expect(paths.toSorted()).toStrictEqual(["endDate", "startDate"])
  })

  it("keeps the range it was given", () => {
    const parsed = adminDashboardZodSchemas.chartRangeInput.parse({ endDate: "2026-03-31", locale: "en-US", startDate: "2026-03-01" })

    expect(parsed).toStrictEqual({ endDate: "2026-03-31", locale: "en-US", startDate: "2026-03-01" })
  })

  it("refuses a range whose dates are not strings", () => {
    const result = adminDashboardZodSchemas.chartRangeInput.safeParse({ endDate: 20_260_331, locale: "en-US", startDate: null })

    expect(result.success).toBe(false)
  })
})
