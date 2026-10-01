import { toCalendarDate } from "~/src/modules/_core/utils/datetime"

export const isCardExpired = (expMonth: number, expYear: number, timeZone: string): boolean => {
  const today = toCalendarDate(new Date(), timeZone)

  return expYear < today.year || (expYear === today.year && expMonth < today.month)
}
