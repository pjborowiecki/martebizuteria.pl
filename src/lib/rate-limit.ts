import "@tanstack/react-start/server-only"

import { type BetterAuthOptions } from "better-auth"
import { getIP } from "better-auth/api"
import { sql } from "drizzle-orm"
import { v7 as uuidv7 } from "uuid"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { rateLimit } from "~/src/modules/rate-limit/rate-limit.schema"

export const IP_ADDRESS_HEADER = "cf-connecting-ip"

const SINGLE_REQUEST = 1

const MS_PER_SECOND = 1000

const UNKNOWN_CLIENT = "unknown"

const IP_OPTIONS: BetterAuthOptions = { advanced: { ipAddress: { ipAddressHeaders: [IP_ADDRESS_HEADER] } } }

interface RateLimitInput {
  readonly key: string
  readonly limit: number
  readonly windowSeconds: number
}

export const clientAddress = (headers: Headers): string => getIP(headers, IP_OPTIONS) ?? UNKNOWN_CLIENT

export const withinRateLimit = async ({ key, limit, windowSeconds }: RateLimitInput): Promise<boolean> => {
  try {
    const now = Date.now()
    const windowStart = now - windowSeconds * MS_PER_SECOND
    const admitted = await db
      .insert(rateLimit)
      .values({ count: SINGLE_REQUEST, id: uuidv7(), key, lastRequest: now })
      .onConflictDoUpdate({
        set: {
          count: sql`case when ${rateLimit.lastRequest} <= ${windowStart} then ${SINGLE_REQUEST} else ${rateLimit.count} + 1 end`,
          lastRequest: sql`case when ${rateLimit.lastRequest} <= ${windowStart} then ${now} else ${rateLimit.lastRequest} end`,
        },
        setWhere: sql`${rateLimit.lastRequest} <= ${windowStart} or ${rateLimit.count} < ${limit}`,
        target: rateLimit.key,
      })
      .returning({ key: rateLimit.key })

    return admitted.length === SINGLE_REQUEST
  } catch (error) {
    console.error("Rate-limit storage unavailable", error)

    return false
  }
}
