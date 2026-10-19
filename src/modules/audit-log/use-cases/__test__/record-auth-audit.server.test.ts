import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import {
  recordAuthLoginAudit,
  recordAuthLoginFailedAudit,
  recordAuthLogoutAudit,
} from "~/src/modules/audit-log/use-cases/record-auth-audit.server"

const record = vi.hoisted(() => ({
  scheduleAuditLog: vi.fn(),
  scheduleAuditLogFromRequest: vi.fn(),
  scheduleSystemAuditLog: vi.fn(),
}))

vi.mock("~/src/modules/audit-log/use-cases/schedule-audit-log.server", () => record)

beforeEach(() => {
  vi.clearAllMocks()
})

describe("actor targeted audit events", () => {
  const actor = { email: "ada@example.test", id: "user-7", name: "Ada Lovelace", role: "customer" } as const

  it("targets the trimmed email and falls back to the actor name as detail", () => {
    recordAuthLoginAudit({ ...actor, email: "  ada@example.test  " }, { ip: "198.51.100.4" })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.AUTH_LOGIN,
      actor: { ...actor, email: "  ada@example.test  " },
      category: "auth",
      detail: "Ada Lovelace",
      ip: "198.51.100.4",
      metadata: { email: "ada@example.test" },
      resourceId: "user-7",
      severity: "info",
      target: "ada@example.test",
    })
  })

  it("targets the actor name when the email is blank", () => {
    recordAuthLogoutAudit({ id: "user-7", name: "Ada Lovelace", role: "customer" })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.AUTH_LOGOUT,
      actor: { id: "user-7", name: "Ada Lovelace", role: "customer" },
      category: "auth",
      detail: undefined,
      ip: undefined,
      metadata: undefined,
      resourceId: "user-7",
      severity: "info",
      target: "Ada Lovelace",
    })
  })

  it("treats a whitespace only email as blank", () => {
    recordAuthLogoutAudit({ email: "   ", id: "user-7", name: "Ada Lovelace", role: "customer" })

    expect(record.scheduleAuditLog).toHaveBeenCalledWith(expect.objectContaining({ metadata: undefined, target: "Ada Lovelace" }))
  })
})

describe("recordAuthLoginFailedAudit", () => {
  it("falls back to the target as detail and leaves the resource id unset", () => {
    recordAuthLoginFailedAudit("ghost@example.test")

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith({
      action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED,
      category: "auth",
      detail: "ghost@example.test",
      ip: undefined,
      metadata: undefined,
      resourceId: undefined,
      severity: "warning",
      target: "ghost@example.test",
    })
  })

  it("keeps a supplied detail and ip", () => {
    recordAuthLoginFailedAudit("ghost@example.test", { detail: "wrong password", ip: "198.51.100.9" })

    expect(record.scheduleSystemAuditLog).toHaveBeenCalledWith(expect.objectContaining({ detail: "wrong password", ip: "198.51.100.9" }))
  })
})
