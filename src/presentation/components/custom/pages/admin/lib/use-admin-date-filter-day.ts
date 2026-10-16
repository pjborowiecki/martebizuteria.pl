import { useCallback } from "react"

import { formatCalendarDateToIsoDate, toCalendarDate } from "~/src/modules/_core/utils/datetime"
import { wallClockStartMs } from "~/src/modules/_core/utils/datetime-column-filter"

import { useDisplayTimeZone, useFormatter } from "~/src/hooks/use-display-format"

export const useAdminDateFilterDay = (): AdminDateFilterDay => {
  const format = useFormatter()
  const timeZone = useDisplayTimeZone()
  const formatIsoDateLabel = useCallback(
    (isoDate: string): string => format.dateTime(new Date(wallClockStartMs(isoDate, timeZone)), { dateStyle: "medium" }),
    [format, timeZone],
  )

  return { formatIsoDateLabel, todayIso: formatCalendarDateToIsoDate(toCalendarDate(new Date(), timeZone)) }
}

interface AdminDateFilterDay {
  readonly formatIsoDateLabel: (isoDate: string) => string
  readonly todayIso: string
}
