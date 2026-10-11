import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  AUDIT_LOG_ACTION,
  type AuditLogAction,
  type AuditLogCategory,
  type AuditLogSeverity,
} from "~/src/modules/audit-log/audit-log.constants"
import {
  type AuditEventOptions,
  recordAuthEmailChangedAudit,
  recordAuthPasswordChangedAudit,
  recordAuthPasswordResetAudit,
  recordAuthRoleChangedAudit,
  recordAuthSessionsRevokedAudit,
  recordAuthTwoFactorDisabledAudit,
  recordAuthTwoFactorEnabledAudit,
  recordAuthUserBannedAudit,
  recordAuthUserUnbannedAudit,
  recordCustomerDeletedAudit,
} from "~/src/modules/audit-log/audit-log.events.server"
import { type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.record.server"

const record = vi.hoisted(() => ({
  scheduleAuditLog: vi.fn(),
  scheduleAuditLogFromRequest: vi.fn(),
  scheduleSystemAuditLog: vi.fn(),
}))

vi.mock("~/src/modules/audit-log/audit-log.record.server", () => record)

interface AccountAuditCase {
  readonly action: AuditLogAction
  readonly category: AuditLogCategory
  readonly name: string
  readonly record: (account: AuditLogActorInput, options?: AuditEventOptions) => void
  readonly severity: AuditLogSeverity
}

const ACCOUNT_CASES: readonly AccountAuditCase[] = [
  {
    action: AUDIT_LOG_ACTION.AUTH_PASSWORD_CHANGED,
    category: "auth",
    name: "a changed password",
    record: recordAuthPasswordChangedAudit,
    severity: "info",
  },
  {
    action: AUDIT_LOG_ACTION.AUTH_PASSWORD_RESET,
    category: "auth",
    name: "a reset password",
    record: recordAuthPasswordResetAudit,
    severity: "warning",
  },
  {
    action: AUDIT_LOG_ACTION.AUTH_EMAIL_CHANGED,
    category: "auth",
    name: "a changed address",
    record: recordAuthEmailChangedAudit,
    severity: "warning",
  },
  {
    action: AUDIT_LOG_ACTION.AUTH_TWO_FACTOR_ENABLED,
    category: "auth",
    name: "two-factor turned on",
    record: recordAuthTwoFactorEnabledAudit,
    severity: "success",
  },
  {
    action: AUDIT_LOG_ACTION.AUTH_TWO_FACTOR_DISABLED,
    category: "auth",
    name: "two-factor turned off",
    record: recordAuthTwoFactorDisabledAudit,
    severity: "warning",
  },
  {
    action: AUDIT_LOG_ACTION.AUTH_SESSIONS_REVOKED,
    category: "auth",
    name: "sessions signed out",
    record: recordAuthSessionsRevokedAudit,
    severity: "info",
  },
  {
    action: AUDIT_LOG_ACTION.AUTH_ROLE_CHANGED,
    category: "auth",
    name: "a changed role",
    record: recordAuthRoleChangedAudit,
    severity: "warning",
  },
  { action: AUDIT_LOG_ACTION.AUTH_USER_BANNED, category: "auth", name: "a ban", record: recordAuthUserBannedAudit, severity: "warning" },
  {
    action: AUDIT_LOG_ACTION.AUTH_USER_UNBANNED,
    category: "auth",
    name: "a lifted ban",
    record: recordAuthUserUnbannedAudit,
    severity: "info",
  },
  {
    action: AUDIT_LOG_ACTION.CUSTOMER_DELETED,
    category: "customers",
    name: "a deleted customer",
    record: recordCustomerDeletedAudit,
    severity: "warning",
  },
]

const customer: AuditLogActorInput = { email: "ada@example.test", id: "user-7", name: "Ada Lovelace", role: "customer" }

const admin: AuditLogActorInput = { email: "owner@example.test", id: "user-1", name: "Owner", role: "admin" }

beforeEach(() => {
  vi.clearAllMocks()
})

describe("account audit events", () => {
  it.each(ACCOUNT_CASES)(
    "files $name against the account holder when they made the change",
    ({ action, category, record: recordAudit, severity }) => {
      recordAudit(customer, { ip: "198.51.100.4" })

      expect(record.scheduleAuditLogFromRequest).not.toHaveBeenCalled()
      expect(record.scheduleSystemAuditLog).not.toHaveBeenCalled()
      expect(record.scheduleAuditLog).toHaveBeenCalledExactlyOnceWith({
        action,
        actor: customer,
        category,
        detail: "Ada Lovelace",
        ip: "198.51.100.4",
        metadata: { email: "ada@example.test" },
        resourceId: "user-7",
        severity,
        target: "ada@example.test",
      })
    },
  )

  it.each(ACCOUNT_CASES)("credits $name to the admin who made it, still against the customer's account", ({ record: recordAudit }) => {
    recordAudit(customer, { actor: admin, detail: "admin", ip: "203.0.113.9" })

    expect(record.scheduleAuditLog).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ actor: admin, detail: "admin", ip: "203.0.113.9", resourceId: "user-7", target: "ada@example.test" }),
    )
  })

  it.each(ACCOUNT_CASES)("names an account without an address for $name", ({ record: recordAudit }) => {
    recordAudit({ id: "user-8", name: "Grace", role: "unknown" })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith(expect.objectContaining({ ip: undefined, metadata: undefined, target: "Grace" }))
  })
})
