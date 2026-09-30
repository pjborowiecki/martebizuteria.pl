import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vite-plus/test"

import { CUSTOMER_ACCOUNT_MUTATION_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { revokeCustomerSessionMutation } from "~/src/modules/customer-account/use-cases/revoke-customer-session"
import { revokeOtherCustomerSessionsMutation } from "~/src/modules/customer-account/use-cases/revoke-other-customer-sessions"
import { updateCustomerPhoneMutation } from "~/src/modules/customer-account/use-cases/update-customer-phone"

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  authorized: () => ({}),
  withRateLimit: () => ({}),
}))
vi.mock("~/src/integrations/drizzle-orm/drizzle.database", () => ({ db: {} }))
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

describe("customer account mutation keys", () => {
  it("namespaces every mutation under the feature", () => {
    expect(revokeCustomerSessionMutation.mutationKey).toStrictEqual(CUSTOMER_ACCOUNT_MUTATION_KEYS.REVOKE_SESSION)
    expect(revokeOtherCustomerSessionsMutation.mutationKey).toStrictEqual(CUSTOMER_ACCOUNT_MUTATION_KEYS.REVOKE_OTHER_SESSIONS)
    expect(updateCustomerPhoneMutation.mutationKey).toStrictEqual(CUSTOMER_ACCOUNT_MUTATION_KEYS.UPDATE_PHONE)
  })

  it("keeps the three keys distinct so their pending states do not collide", () => {
    const keys = [
      revokeCustomerSessionMutation.mutationKey,
      revokeOtherCustomerSessionsMutation.mutationKey,
      updateCustomerPhoneMutation.mutationKey,
    ].map((key) => key.join("."))

    expect(new Set(keys).size).toBe(keys.length)
  })
})

describe("customer account mutation payloads", () => {
  it("sends the session to revoke as the request payload", async () => {
    await expect(revokeCustomerSessionMutation.mutationFn?.({ sessionId: "session-2" }, mutationContext)).resolves.toStrictEqual({
      data: { sessionId: "session-2" },
    })
  })

  it("sends the new phone as the request payload", async () => {
    await expect(updateCustomerPhoneMutation.mutationFn?.({ phone: "+48123456789" }, mutationContext)).resolves.toStrictEqual({
      data: { phone: "+48123456789" },
    })
  })

  it("revokes the other sessions without any payload", async () => {
    await expect(revokeOtherCustomerSessionsMutation.mutationFn?.(undefined, mutationContext)).resolves.toBeUndefined()
  })
})
