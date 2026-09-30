import zod from "zod/v4"

export const adminDashboardZodSchemas = {
  chartRangeInput: zod.object({
    endDate: zod.string(),
    locale: zod.string(),
    startDate: zod.string(),
  }),
  snapshotInput: zod.object({
    locale: zod.string(),
  }),
}
