import { inArray, lt, sql } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { PUBLIC_EMAIL_RATE_LIMIT_KEY, RATE_LIMIT_WINDOW_SECONDS } from "~/src/modules/rate-limit/rate-limit.constants"
import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

const MS_PER_SECOND = 1000

const PUBLIC_EMAIL_KEYS = `${PUBLIC_EMAIL_RATE_LIMIT_KEY.PREFIX}%`

const DAILY_PUBLIC_EMAIL_KEYS = `${PUBLIC_EMAIL_KEYS}${PUBLIC_EMAIL_RATE_LIMIT_KEY.DAILY_SUFFIX}`

const windowStartedBefore = (now: Date, windowSeconds: number): number => now.getTime() - windowSeconds * MS_PER_SECOND

export const deleteExpiredRateLimits = async ({ limit, now }: DeleteExpiredRateLimitsInput): Promise<number> => {
  const expiredBefore = sql`case
    when ${rateLimit.key} like ${DAILY_PUBLIC_EMAIL_KEYS} then ${windowStartedBefore(now, RATE_LIMIT_WINDOW_SECONDS.PUBLIC_EMAIL_DAILY)}
    when ${rateLimit.key} like ${PUBLIC_EMAIL_KEYS} then ${windowStartedBefore(now, RATE_LIMIT_WINDOW_SECONDS.PUBLIC_EMAIL_RECIPIENT)}
    else ${windowStartedBefore(now, RATE_LIMIT_WINDOW_SECONDS.REQUEST)}
  end`
  const expired = db.select({ id: rateLimit.id }).from(rateLimit).where(lt(rateLimit.lastRequest, expiredBefore)).limit(limit)
  const deleted = await db.delete(rateLimit).where(inArray(rateLimit.id, expired)).returning({ id: rateLimit.id })

  return deleted.length
}

export interface DeleteExpiredRateLimitsInput {
  readonly limit: number
  readonly now: Date
}
