import { useSyncExternalStore } from "react"

import { resolveAuditLogToday, resolveNextAuditLogDayStart } from "~/src/modules/audit-log/audit-log.utils"

const subscribeToAuditLogDayChange = (onDayChange: () => void): (() => void) => {
  let timeout: ReturnType<typeof setTimeout> | undefined = undefined
  const waitForNextDay = (): void => {
    const now = new Date()
    timeout = setTimeout(
      () => {
        onDayChange()
        waitForNextDay()
      },
      resolveNextAuditLogDayStart(now).getTime() - now.getTime(),
    )
  }
  waitForNextDay()

  return () => {
    clearTimeout(timeout)
  }
}

export const useAuditLogToday = (): string => useSyncExternalStore(subscribeToAuditLogDayChange, resolveAuditLogToday, resolveAuditLogToday)
