import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const { recordPasswordChanged, requestHeaders, session, setCredential } = vi.hoisted(() => ({
  recordPasswordChanged: vi.fn<(actor: unknown, options: unknown) => void>(),
  requestHeaders: new Headers({ "cf-connecting-ip": "203.0.113.7", cookie: "better-auth.session_token=signed" }),
  session: { createdAt: new Date() },
  setCredential: vi.fn<(input: { body: Readonly<Record<string, string>>; headers: Headers }) => Promise<{ status: boolean }>>(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({
  RATE_LIMITS: { SENSITIVE: { max: 3, window: 60 } },
  authorized: () => ({}),
  withRateLimit: () => ({}),
}))
vi.mock("~/src/integrations/better-auth/auth.server", () => ({ auth: { api: { setPassword: setCredential } } }))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordAuthPasswordChangedAudit: recordPasswordChanged,
  resolveAuthAuditActor: (user: { readonly id: string }) => `actor:${user.id}`,
}))
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const state: { validator?: (input: unknown) => unknown } = {}
    const builder = {
      handler: (handler: (options: { context: unknown; data: unknown }) => unknown) => (options: { data: unknown }) =>
        Promise.resolve(options.data)
          .then((data) => (state.validator === undefined ? data : state.validator(data)))
          .then((data) => handler({ context: { auth: { session, user: { id: "user-1" } }, requestHeaders }, data })),
      middleware: () => builder,
      validator: (validator: (input: unknown) => unknown) => {
        state.validator = validator

        return builder
      },
    }

    return builder
  },
}))

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import { setAccountPassword, setAccountPasswordMutation } from "~/src/modules/account/use-cases/set-account-password"

const NEW_PASSWORD = "GooglePassword1!"

const HOUR_MS = 3_600_000

beforeEach(() => {
  vi.clearAllMocks()
  session.createdAt = new Date(Date.now() - HOUR_MS)
  setCredential.mockResolvedValue({ status: true })
})

describe("setAccountPassword", () => {
  it("adds the password through Better Auth on the browser's own session", async () => {
    await expect(setAccountPassword({ data: { newPassword: NEW_PASSWORD } })).resolves.toStrictEqual({ ok: true })

    expect(setCredential).toHaveBeenCalledExactlyOnceWith({ body: { newPassword: NEW_PASSWORD }, headers: requestHeaders })
  })

  it("records the new password in the audit log with the caller's address", async () => {
    await setAccountPassword({ data: { newPassword: NEW_PASSWORD } })

    expect(recordPasswordChanged).toHaveBeenCalledExactlyOnceWith("actor:user-1", { ip: "203.0.113.7" })
  })

  it("refuses a password that breaks the shop's password rules before it reaches Better Auth", async () => {
    await expect(setAccountPassword({ data: { newPassword: "short" } })).rejects.toThrow()

    expect(setCredential).not.toHaveBeenCalled()
    expect(recordPasswordChanged).not.toHaveBeenCalled()
  })

  it("asks for a fresh sign-in when the session is a day old, so a stolen cookie cannot add a lasting password", async () => {
    session.createdAt = new Date(Date.now() - 25 * HOUR_MS)

    await expect(setAccountPassword({ data: { newPassword: NEW_PASSWORD } })).rejects.toMatchObject({
      body: { code: "SESSION_NOT_FRESH" },
    })
    expect(setCredential).not.toHaveBeenCalled()
    expect(recordPasswordChanged).not.toHaveBeenCalled()
  })

  it("records nothing when Better Auth refuses, for example because the account already has a password", async () => {
    setCredential.mockRejectedValue(new Error("PASSWORD_ALREADY_SET"))

    await expect(setAccountPassword({ data: { newPassword: NEW_PASSWORD } })).rejects.toThrow("PASSWORD_ALREADY_SET")

    expect(recordPasswordChanged).not.toHaveBeenCalled()
  })
})

describe("setAccountPasswordMutation", () => {
  it("is keyed under the account feature and sends the new password as its payload", async () => {
    expect(setAccountPasswordMutation.mutationKey).toStrictEqual(ACCOUNT_MUTATION_KEYS.SET_PASSWORD)
    await expect(
      setAccountPasswordMutation.mutationFn?.({ newPassword: NEW_PASSWORD }, { client: new QueryClient(), meta: undefined }),
    ).resolves.toStrictEqual({ ok: true })
  })
})
