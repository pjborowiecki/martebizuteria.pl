import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vite-plus/test"

import { SESSION_MUTATION_KEYS } from "~/src/modules/session/session.constants"
import { revokeCustomerSessionMutation } from "~/src/modules/session/use-cases/revoke-customer-session"
import { revokeOtherCustomerSessionsMutation } from "~/src/modules/session/use-cases/revoke-other-customer-sessions"

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  authorized: () => ({}),
  withRateLimit: () => ({}),
}))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))
vi.mock("~/src/modules/audit-log/use-cases/record-auth-audit.server", () => ({}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: () => (options?: { data?: unknown }) => Promise.resolve(options),
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

const mutationContext = { client: new QueryClient(), meta: undefined }

describe("customer session mutation keys", () => {
  it("namespaces every mutation under the feature", () => {
    expect(revokeCustomerSessionMutation.mutationKey).toStrictEqual(SESSION_MUTATION_KEYS.REVOKE_SESSION)
    expect(revokeOtherCustomerSessionsMutation.mutationKey).toStrictEqual(SESSION_MUTATION_KEYS.REVOKE_OTHER_SESSIONS)
  })

  it("keeps the two keys distinct so their pending states do not collide", () => {
    const keys = [revokeCustomerSessionMutation.mutationKey, revokeOtherCustomerSessionsMutation.mutationKey].map((key) => key.join("."))

    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("customer session mutation payloads", () => {
  it("sends the session to revoke as the request payload", async () => {
    await expect(revokeCustomerSessionMutation.mutationFn?.({ sessionId: "session-2" }, mutationContext)).resolves.toStrictEqual({
      data: { sessionId: "session-2" },
    })
  })

  it("revokes the other sessions without any payload", async () => {
    await expect(revokeOtherCustomerSessionsMutation.mutationFn?.(undefined, mutationContext)).resolves.toBeUndefined()
  })
})
