import { formatCustomerAccountRelativeTime } from "~/src/modules/customer-account/customer-account.utils"

const ACTIVE_NOW_MINUTES = 5

const MILLISECONDS_PER_MINUTE = 60_000

export const formatSessionLastActive = (lastActiveAt: Date, locale: string, activeNowLabel: string): string => {
  const diffMinutes = Math.floor((Date.now() - lastActiveAt.getTime()) / MILLISECONDS_PER_MINUTE)

  if (diffMinutes < ACTIVE_NOW_MINUTES) {
    return activeNowLabel
  }

  return formatCustomerAccountRelativeTime(lastActiveAt, locale)
}
