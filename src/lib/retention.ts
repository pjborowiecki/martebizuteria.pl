import "@tanstack/react-start/server-only"

import { deleteExpiredAuditLogs } from "~/src/modules/audit-log/use-cases/delete-expired-audit-logs.server"
import { anonymizeEndedCheckouts } from "~/src/modules/checkout/use-cases/anonymize-ended-checkouts.server"
import { deleteLapsedNewsletterSubscribers } from "~/src/modules/newsletter/use-cases/delete-lapsed-newsletter-subscribers.server"
import { deleteExpiredRateLimits } from "~/src/modules/rate-limit/use-cases/delete-expired-rate-limits.server"
import { deleteExpiredSessions } from "~/src/modules/session/use-cases/delete-expired-sessions.server"
import { deleteExpiredVerifications } from "~/src/modules/verification/use-cases/delete-expired-verifications.server"

export const RETENTION_BATCH_ROWS = 500

export const RETENTION_BATCHES_PER_RUN = 5

const MILLISECONDS_PER_DAY = 86_400_000

const RETENTION_DAYS = {
  CUSTOMER_ACTIVITY: 90,
  ENDED_CHECKOUT: 30,
  UNCONFIRMED_NEWSLETTER: 30,
  UNSUBSCRIBED_NEWSLETTER: 30,
} as const

const RETENTION_MONTHS = {
  AUDIT_LOG: 24,
  SIGN_IN_HISTORY: 12,
} as const

const daysBefore = (now: Date, days: number): Date => new Date(now.getTime() - days * MILLISECONDS_PER_DAY)

const monthsBefore = (now: Date, months: number): Date => {
  const cutoff = new Date(now)
  cutoff.setUTCMonth(cutoff.getUTCMonth() - months)

  return cutoff
}

type RetentionBatch = (limit: number) => Promise<number>

const retentionBatches = (now: Date): Record<string, RetentionBatch> => ({
  auditLogEntries: (limit) =>
    deleteExpiredAuditLogs({
      customerActivityBefore: daysBefore(now, RETENTION_DAYS.CUSTOMER_ACTIVITY),
      entryBefore: monthsBefore(now, RETENTION_MONTHS.AUDIT_LOG),
      limit,
      signInHistoryBefore: monthsBefore(now, RETENTION_MONTHS.SIGN_IN_HISTORY),
    }),
  endedCheckouts: (limit) => anonymizeEndedCheckouts({ endedBefore: daysBefore(now, RETENTION_DAYS.ENDED_CHECKOUT), limit }),
  newsletterSubscribers: (limit) =>
    deleteLapsedNewsletterSubscribers({
      limit,
      unconfirmedBefore: daysBefore(now, RETENTION_DAYS.UNCONFIRMED_NEWSLETTER),
      unsubscribedBefore: daysBefore(now, RETENTION_DAYS.UNSUBSCRIBED_NEWSLETTER),
    }),
  rateLimits: (limit) => deleteExpiredRateLimits({ limit, now }),
  sessions: (limit) => deleteExpiredSessions({ expiredBefore: now, limit }),
  verifications: (limit) => deleteExpiredVerifications({ expiredBefore: now, limit }),
})

const drain = async (removeBatch: RetentionBatch, batchesLeft = RETENTION_BATCHES_PER_RUN): Promise<number> => {
  const removed = await removeBatch(RETENTION_BATCH_ROWS)
  if (removed < RETENTION_BATCH_ROWS || batchesLeft === 1) {
    return removed
  }

  return removed + (await drain(removeBatch, batchesLeft - 1))
}

const cleanUp = async ([kind, removeBatch]: [string, RetentionBatch]): Promise<boolean> => {
  try {
    console.info(`[Retention] ${kind}: ${String(await drain(removeBatch))} cleared`)

    return true
  } catch (error) {
    console.error(`[Retention] ${kind} could not be cleared:`, error)

    return false
  }
}

export const enforceRetentionPeriods = async (now: Date): Promise<void> => {
  const cleared = await Promise.all(Object.entries(retentionBatches(now)).map((entry) => cleanUp(entry)))
  if (cleared.includes(false)) {
    throw new Error("[Retention] The clean-up did not finish; each failure is logged above")
  }
}
