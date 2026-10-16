import { useCallback, useSyncExternalStore } from "react"

import { resolveAuditLogToday, resolveNextAuditLogDayStart } from "~/src/modules/audit-log/audit-log.utils"

import { useDisplayTimeZone } from "~/src/hooks/use-display-format"

const subscribeToAuditLogDayChange = (onDayChange: () => void, timeZone: string): (() => void) => {
  let timeout: ReturnType<typeof setTimeout> | undefined = undefined
  const waitForNextDay = (): void => {
    const now = new Date()
    timeout = setTimeout(
      () => {
        onDayChange()
        waitForNextDay()
      },
      resolveNextAuditLogDayStart(now, timeZone).getTime() - now.getTime(),
    )
  }
  waitForNextDay()

  return () => {
    clearTimeout(timeout)
  }
}

export const useAuditLogToday = (): string => {
  const timeZone = useDisplayTimeZone()
  const subscribe = useCallback((onDayChange: () => void) => subscribeToAuditLogDayChange(onDayChange, timeZone), [timeZone])
  const readToday = useCallback(() => resolveAuditLogToday(timeZone), [timeZone])

  return useSyncExternalStore(subscribe, readToday, readToday)
}
