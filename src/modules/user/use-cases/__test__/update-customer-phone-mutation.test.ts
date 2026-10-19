import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it, vi } from "vite-plus/test"

import { updateCustomerPhoneMutation } from "~/src/modules/user/use-cases/update-customer-phone"
import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"

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

describe("updateCustomerPhoneMutation", () => {
  it("keys the mutation under the customer phone update", () => {
    expect(updateCustomerPhoneMutation.mutationKey).toStrictEqual(USER_MUTATION_KEYS.UPDATE_CUSTOMER_PHONE)
  })

  it("sends the new phone as the request payload", async () => {
    await expect(updateCustomerPhoneMutation.mutationFn?.({ phone: "+48123456789" }, mutationContext)).resolves.toStrictEqual({
      data: { phone: "+48123456789" },
    })
  })
})
