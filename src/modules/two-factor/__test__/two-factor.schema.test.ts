import { getTableColumns, getTableName } from "drizzle-orm"
import { describe, expect, it } from "vite-plus/test"

import { twoFactor } from "~/src/modules/two-factor/two-factor.schema"

const columns = getTableColumns(twoFactor)

describe("two factor table", () => {
  it("is stored as two_factor", () => {
    expect(getTableName(twoFactor)).toBe("two_factor")
  })

  it.each([
    ["backupCodes", "backup_codes"],
    ["failedVerificationCount", "failed_verification_count"],
    ["id", "id"],
    ["lockedUntil", "locked_until"],
    ["secret", "secret"],
    ["userId", "user_id"],
    ["verified", "verified"],
    ["createdAt", "created_at"],
    ["updatedAt", "updated_at"],
  ] as const)("maps %s onto the %s column", (property, columnName) => {
    expect(columns[property].name).toBe(columnName)
  })

  it("keys a row by its id", () => {
    expect(columns.id.primary).toBe(true)
  })

  it("requires the secret, the backup codes and the owner", () => {
    expect(columns.secret.notNull).toBe(true)
    expect(columns.backupCodes.notNull).toBe(true)
    expect(columns.userId.notNull).toBe(true)
  })

  it("starts the failed verification counter at zero", () => {
    expect(columns.failedVerificationCount.default).toBe(0)
    expect(columns.failedVerificationCount.notNull).toBe(true)
  })

  it("treats a new factor as verified", () => {
    expect(columns.verified.default).toBe(true)
  })

  it("leaves the lockout window open until a lockout happens", () => {
    expect(columns.lockedUntil.notNull).toBe(false)
    expect(columns.lockedUntil.hasDefault).toBe(false)
  })

  it("stores the lockout window as a millisecond timestamp", () => {
    expect(columns.lockedUntil.getSQLType()).toBe("integer")
  })
})
