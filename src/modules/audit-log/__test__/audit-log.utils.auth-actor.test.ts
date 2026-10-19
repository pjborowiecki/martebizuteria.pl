import { describe, expect, it } from "vite-plus/test"

import { resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.utils"

describe("resolveAuthAuditActor", () => {
  it("maps the admin role", () => {
    expect(resolveAuthAuditActor({ email: "admin@example.test", id: "user-1", name: "Admin", role: "admin" })).toStrictEqual({
      email: "admin@example.test",
      id: "user-1",
      name: "Admin",
      role: "admin",
    })
  })

  it("maps the customer role", () => {
    expect(resolveAuthAuditActor({ email: "ada@example.test", id: "user-2", name: "Ada", role: "customer" }).role).toBe("customer")
  })

  it("falls back to unknown for an unrecognised role", () => {
    expect(resolveAuthAuditActor({ email: "bot@example.test", id: "user-3", name: "Bot", role: "editor" }).role).toBe("unknown")
  })

  it("falls back to unknown when the role is missing", () => {
    expect(resolveAuthAuditActor({ email: "bot@example.test", id: "user-4", name: "Bot" }).role).toBe("unknown")
  })

  it("falls back to unknown for a null role", () => {
    expect(resolveAuthAuditActor({ email: "bot@example.test", id: "user-5", name: "Bot", role: null }).role).toBe("unknown")
  })
})
