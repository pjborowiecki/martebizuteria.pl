import { formatRelativeFromNow } from "~/src/modules/_core/utils/datetime"

const ACTIVE_NOW_MINUTES = 5

const MILLISECONDS_PER_MINUTE = 60_000

export const formatSessionLastActive = (lastActiveAt: Date, locale: string, activeNowLabel: string): string => {
  const diffMinutes = Math.floor((Date.now() - lastActiveAt.getTime()) / MILLISECONDS_PER_MINUTE)

  if (diffMinutes < ACTIVE_NOW_MINUTES) {
    return activeNowLabel
  }

  return formatRelativeFromNow(lastActiveAt, locale)
}
