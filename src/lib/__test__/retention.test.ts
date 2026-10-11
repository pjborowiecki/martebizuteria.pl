import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { RETENTION_BATCHES_PER_RUN, RETENTION_BATCH_ROWS, enforceRetentionPeriods } from "~/src/lib/retention"

type BatchCleanUp = (input: { readonly limit: number }) => Promise<number>

const cleanUp = vi.hoisted(() => ({
  anonymizeEndedCheckouts: vi.fn<BatchCleanUp>(),
  deleteExpiredAuditLogs: vi.fn<BatchCleanUp>(),
  deleteExpiredRateLimits: vi.fn<BatchCleanUp>(),
  deleteExpiredSessions: vi.fn<BatchCleanUp>(),
  deleteExpiredVerifications: vi.fn<BatchCleanUp>(),
  deleteLapsedNewsletterSubscribers: vi.fn<BatchCleanUp>(),
}))

vi.mock("~/src/modules/audit-log/use-cases/delete-expired-audit-logs.server", () => ({
  deleteExpiredAuditLogs: cleanUp.deleteExpiredAuditLogs,
}))
vi.mock("~/src/modules/checkout/use-cases/anonymize-ended-checkouts.server", () => ({
  anonymizeEndedCheckouts: cleanUp.anonymizeEndedCheckouts,
}))
vi.mock("~/src/modules/newsletter/use-cases/delete-lapsed-newsletter-subscribers.server", () => ({
  deleteLapsedNewsletterSubscribers: cleanUp.deleteLapsedNewsletterSubscribers,
}))
vi.mock("~/src/modules/rate-limit/use-cases/delete-expired-rate-limits.server", () => ({
  deleteExpiredRateLimits: cleanUp.deleteExpiredRateLimits,
}))
vi.mock("~/src/modules/session/use-cases/delete-expired-sessions.server", () => ({
  deleteExpiredSessions: cleanUp.deleteExpiredSessions,
}))
vi.mock("~/src/modules/verification/use-cases/delete-expired-verifications.server", () => ({
  deleteExpiredVerifications: cleanUp.deleteExpiredVerifications,
}))

const NOW = new Date("2026-10-10T03:00:00.000Z")

const everyCleanUp = Object.values(cleanUp)

const fullBatch = () => Promise.resolve(RETENTION_BATCH_ROWS)

beforeEach(() => {
  for (const removeBatch of everyCleanUp) {
    removeBatch.mockReset()
    removeBatch.mockResolvedValue(0)
  }
  vi.spyOn(console, "info").mockImplementation(() => {})
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("enforceRetentionPeriods cut-offs", () => {
  it("anonymises checkouts that ended more than 30 days ago", async () => {
    await enforceRetentionPeriods(NOW)

    expect(cleanUp.anonymizeEndedCheckouts).toHaveBeenCalledExactlyOnceWith({
      endedBefore: new Date("2026-09-10T03:00:00.000Z"),
      limit: RETENTION_BATCH_ROWS,
    })
  })

  it("keeps customer activity for 90 days, sign-in history for 12 months and every other entry for 2 years", async () => {
    await enforceRetentionPeriods(NOW)

    expect(cleanUp.deleteExpiredAuditLogs).toHaveBeenCalledExactlyOnceWith({
      customerActivityBefore: new Date("2026-07-12T03:00:00.000Z"),
      entryBefore: new Date("2024-10-10T03:00:00.000Z"),
      limit: RETENTION_BATCH_ROWS,
      signInHistoryBefore: new Date("2025-10-10T03:00:00.000Z"),
    })
  })

  it("drops unconfirmed sign-ups and unsubscribed addresses after 30 days", async () => {
    await enforceRetentionPeriods(NOW)

    expect(cleanUp.deleteLapsedNewsletterSubscribers).toHaveBeenCalledExactlyOnceWith({
      limit: RETENTION_BATCH_ROWS,
      unconfirmedBefore: new Date("2026-09-10T03:00:00.000Z"),
      unsubscribedBefore: new Date("2026-09-10T03:00:00.000Z"),
    })
  })

  it("deletes sessions and verification tokens as soon as they expire", async () => {
    await enforceRetentionPeriods(NOW)

    expect(cleanUp.deleteExpiredSessions).toHaveBeenCalledExactlyOnceWith({ expiredBefore: NOW, limit: RETENTION_BATCH_ROWS })
    expect(cleanUp.deleteExpiredVerifications).toHaveBeenCalledExactlyOnceWith({ expiredBefore: NOW, limit: RETENTION_BATCH_ROWS })
  })

  it("deletes rate-limit counters whose window has ended at the time of the run", async () => {
    await enforceRetentionPeriods(NOW)

    expect(cleanUp.deleteExpiredRateLimits).toHaveBeenCalledExactlyOnceWith({ limit: RETENTION_BATCH_ROWS, now: NOW })
  })

  it("counts calendar months back from 29 February to 1 March of a year without one", async () => {
    await enforceRetentionPeriods(new Date("2028-02-29T03:00:00.000Z"))

    expect(cleanUp.deleteExpiredAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        entryBefore: new Date("2026-03-01T03:00:00.000Z"),
        signInHistoryBefore: new Date("2027-03-01T03:00:00.000Z"),
      }),
    )
  })
})

describe("enforceRetentionPeriods batching", () => {
  it("takes another batch while the last one came back full", async () => {
    cleanUp.deleteExpiredSessions.mockImplementationOnce(fullBatch).mockResolvedValueOnce(7)

    await enforceRetentionPeriods(NOW)

    expect(cleanUp.deleteExpiredSessions).toHaveBeenCalledTimes(2)
    expect(console.info).toHaveBeenCalledWith(`[Retention] sessions: ${String(RETENTION_BATCH_ROWS + 7)} cleared`)
  })

  it("stops after the run's last batch and leaves the rest for the next day", async () => {
    cleanUp.deleteExpiredAuditLogs.mockImplementation(fullBatch)

    await enforceRetentionPeriods(NOW)

    expect(cleanUp.deleteExpiredAuditLogs).toHaveBeenCalledTimes(RETENTION_BATCHES_PER_RUN)
    expect(console.info).toHaveBeenCalledWith(
      `[Retention] auditLogEntries: ${String(RETENTION_BATCH_ROWS * RETENTION_BATCHES_PER_RUN)} cleared`,
    )
  })

  it("asks once for a kind of row that has nothing left to clear", async () => {
    await enforceRetentionPeriods(NOW)

    for (const removeBatch of everyCleanUp) {
      expect(removeBatch).toHaveBeenCalledOnce()
    }
    expect(console.info).toHaveBeenCalledWith("[Retention] verifications: 0 cleared")
  })
})

describe("enforceRetentionPeriods failures", () => {
  it("clears every other kind of row when one fails, then fails the run", async () => {
    const failure = new Error("D1_ERROR: database is locked")
    cleanUp.anonymizeEndedCheckouts.mockRejectedValue(failure)

    await expect(enforceRetentionPeriods(NOW)).rejects.toThrow("[Retention] The clean-up did not finish; each failure is logged above")

    expect(console.error).toHaveBeenCalledExactlyOnceWith("[Retention] endedCheckouts could not be cleared:", failure)
    expect(cleanUp.deleteExpiredAuditLogs).toHaveBeenCalledOnce()
    expect(cleanUp.deleteExpiredRateLimits).toHaveBeenCalledOnce()
    expect(cleanUp.deleteExpiredSessions).toHaveBeenCalledOnce()
    expect(cleanUp.deleteExpiredVerifications).toHaveBeenCalledOnce()
    expect(cleanUp.deleteLapsedNewsletterSubscribers).toHaveBeenCalledOnce()
  })
})
