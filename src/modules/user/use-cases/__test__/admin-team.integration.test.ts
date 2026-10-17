import { MutationObserver, QueryClient } from "@tanstack/react-query"
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import { z } from "zod"

import { applyMigrationHistory } from "~/src/platform/testing/mocks/migrations"

import { ROLES } from "~/src/integrations/better-auth/auth.access"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { grantAdminAccess, grantAdminAccessMutation } from "~/src/modules/user/use-cases/grant-admin-access"
import { listAdminTeam, listAdminTeamQuery } from "~/src/modules/user/use-cases/list-admin-team"
import { revokeAdminAccess, revokeAdminAccessMutation } from "~/src/modules/user/use-cases/revoke-admin-access"
import { searchTeamCandidates, searchTeamCandidatesQuery } from "~/src/modules/user/use-cases/search-team-candidates"
import { TEAM_ERROR, USER_MUTATION_KEYS, USER_QUERY_KEYS } from "~/src/modules/user/user.constants"

interface TestSession {
  readonly session: { readonly createdAt: Date; readonly id: string }
  readonly user: {
    readonly email: string
    readonly id: string
    readonly name: string
    readonly role: string
    readonly twoFactorEnabled: boolean
  }
}

const { effects, sqlite } = await vi.hoisted(async () => {
  const { DatabaseSync } = await import("node:sqlite")

  return {
    effects: {
      audit: vi.fn<(action: string, account: string, options: { actor: string; ip?: string }) => void>(),
      invalidate: vi.fn<() => void>(),
      requestSession: vi.fn<() => Promise<TestSession | null>>(),
    },
    sqlite: new DatabaseSync(":memory:", { enableDoubleQuotedStringLiterals: true }),
  }
})

vi.mock(import("@tanstack/react-start"), async (importOriginal) => {
  const actual = await importOriginal()
  const { withTestRpc } = await import("~/src/platform/testing/lib/server-function")

  return {
    ...actual,
    createServerFn: new Proxy(actual.createServerFn, {
      apply: (target, thisArg, args: unknown[]) => withTestRpc(Reflect.apply(target, thisArg, args)),
    }),
  }
})
vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    getRequest: () => new Request("https://marte.test/en-US/admin/settings/team", { headers: { "cf-connecting-ip": "203.0.113.5" } }),
  }
})
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getRequestSession: effects.requestSession }))
vi.mock("~/src/lib/rate-limit", () => ({}))
vi.mock(import("~/src/integrations/drizzle-orm/drizzle.database"), async () => {
  const { drizzle } = await import("drizzle-orm/d1")
  const schema = await import("~/src/integrations/drizzle-orm/drizzle.schemas")
  const { createTestD1Database } = await import("~/src/platform/testing/mocks/d1")

  return { db: drizzle(createTestD1Database(sqlite), { schema }) }
})
vi.mock("~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server", () => ({
  scheduleAdminCustomersInvalidation: effects.invalidate,
}))
vi.mock("~/src/modules/audit-log/audit-log.events.server", () => ({
  recordTeamAccessAudit: effects.audit,
  resolveAuthAuditActor: (account: { readonly id: string }) => `actor:${account.id}`,
}))

const HOUR_MS = 3_600_000

const SIGNED_IN_AT = Date.UTC(2026, 9, 15, 8)

const ACCOUNT = {
  ADA: { email: "ada@marte.test", id: "user-ada", name: "Ada Admin" },
  BOGNA: { email: "bogna@marte.test", id: "user-bogna", name: "Bogna Admin" },
  CELINA: { email: "celina@marte.test", id: "user-celina", name: "Celina Klientka" },
  DAREK: { email: "darek@marte.test", id: "user-darek", name: "Darek Niepotwierdzony" },
  EWA: { email: "ewa@marte.test", id: "user-ewa", name: "Ewa Zablokowana" },
} as const

const rolesSchema = z.array(z.object({ id: z.string(), role: z.string() }))

const sessionsSchema = z.array(z.object({ id: z.string() }))

const insertAccount = (
  { email, id, name }: Readonly<{ email: string; id: string; name: string }>,
  {
    banned = 0,
    role = ROLES.CUSTOMER,
    twoFactor = 0,
    verified = 1,
  }: { banned?: number; role?: string; twoFactor?: number; verified?: number } = {},
): void => {
  sqlite
    .prepare(
      `insert into user (id, name, email, email_verified, role, banned, two_factor_enabled, created_at, updated_at)
        values (?, ?, ?, ?, ?, ?, ?, 0, 0)`,
    )
    .run(id, name, email, verified, role, banned, twoFactor)
}

const insertSignInMethod = (userId: string, providerId: string): void => {
  sqlite
    .prepare(`insert into account (id, account_id, provider_id, user_id, created_at, updated_at) values (?, ?, ?, ?, 0, 0)`)
    .run(`${userId}-${providerId}`, userId, providerId, userId)
}

const insertSession = (id: string, userId: string): void => {
  sqlite
    .prepare(`insert into session (id, token, user_id, expires_at, created_at, updated_at) values (?, ?, ?, ?, 0, 0)`)
    .run(id, `token-${id}`, userId, Date.UTC(2027, 0, 1))
}

const insertSignIn = ({ action = AUDIT_LOG_ACTION.AUTH_LOGIN, at, id }: Readonly<{ action?: string; at: number; id: string }>): void => {
  sqlite
    .prepare(
      `insert into audit_log (id, action, actor_name, actor_role, category, created_at, resource_id, severity, target)
        values (?, ?, 'Ada', 'admin', 'auth', ?, ?, 'info', 'ada@marte.test')`,
    )
    .run(id, action, at, ACCOUNT.ADA.id)
}

const roles = (): Readonly<Record<string, string>> =>
  Object.fromEntries(
    rolesSchema.parse(sqlite.prepare("select id, role from user order by id").all()).map(({ id, role }) => [id, role] as const),
  )

const sessionIds = (): readonly string[] =>
  sessionsSchema.parse(sqlite.prepare("select id from session order by id").all()).map(({ id }) => id)

const signedInAs = (
  account: (typeof ACCOUNT)[keyof typeof ACCOUNT],
  { hoursAgo = 1, role = ROLES.ADMIN, twoFactorEnabled = true }: { hoursAgo?: number; role?: string; twoFactorEnabled?: boolean } = {},
): void => {
  effects.requestSession.mockResolvedValue({
    session: { createdAt: new Date(Date.now() - hoursAgo * HOUR_MS), id: `session-${account.id}` },
    user: { ...account, role, twoFactorEnabled },
  })
}

beforeAll(() => {
  applyMigrationHistory(sqlite)
})

beforeEach(() => {
  vi.clearAllMocks()
  sqlite.exec(`delete from session; delete from account; delete from audit_log; delete from user;`)
  insertAccount(ACCOUNT.ADA, { role: ROLES.ADMIN, twoFactor: 1 })
  insertAccount(ACCOUNT.BOGNA, { role: ROLES.ADMIN })
  insertAccount(ACCOUNT.CELINA)
  insertAccount(ACCOUNT.DAREK, { verified: 0 })
  insertAccount(ACCOUNT.EWA, { banned: 1 })
  insertSession("ada-laptop", ACCOUNT.ADA.id)
  insertSession("bogna-laptop", ACCOUNT.BOGNA.id)
  insertSession("bogna-phone", ACCOUNT.BOGNA.id)
  insertSession("celina-phone", ACCOUNT.CELINA.id)
  signedInAs(ACCOUNT.ADA)
})

afterAll(() => {
  sqlite.close()
})

describe("listAdminTeam", () => {
  it("lists every admin with their sign-in methods, two-factor state and latest sign-in, and marks the caller", async () => {
    insertSignInMethod(ACCOUNT.ADA.id, "credential")
    insertSignInMethod(ACCOUNT.BOGNA.id, "credential")
    insertSignInMethod(ACCOUNT.BOGNA.id, "google")
    insertSignIn({ at: SIGNED_IN_AT - HOUR_MS, id: "ada-old" })
    insertSignIn({ at: SIGNED_IN_AT, id: "ada-new" })
    insertSignIn({ action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED, at: SIGNED_IN_AT + HOUR_MS, id: "ada-failed" })

    await expect(listAdminTeam()).resolves.toStrictEqual({
      members: [
        {
          email: ACCOUNT.ADA.email,
          hasGoogle: false,
          hasPassword: true,
          id: ACCOUNT.ADA.id,
          isCurrentUser: true,
          lastSignInAt: new Date(SIGNED_IN_AT),
          name: ACCOUNT.ADA.name,
          twoFactorEnabled: true,
        },
        {
          email: ACCOUNT.BOGNA.email,
          hasGoogle: true,
          hasPassword: true,
          id: ACCOUNT.BOGNA.id,
          isCurrentUser: false,
          lastSignInAt: undefined,
          name: ACCOUNT.BOGNA.name,
          twoFactorEnabled: false,
        },
      ],
      recentSignIn: true,
    })
  })

  it("tells the page that the caller signed in more than a day ago, so it can ask for a fresh sign-in first", async () => {
    signedInAs(ACCOUNT.ADA, { hoursAgo: 25 })

    await expect(listAdminTeam()).resolves.toMatchObject({ recentSignIn: false })
  })

  it("is closed to a customer", async () => {
    signedInAs(ACCOUNT.CELINA, { role: ROLES.CUSTOMER, twoFactorEnabled: false })

    await expect(listAdminTeam()).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("is the team query the settings page loads", async () => {
    const queryClient = new QueryClient()

    await expect(queryClient.query(listAdminTeamQuery())).resolves.toMatchObject({ recentSignIn: true })
    expect(listAdminTeamQuery().queryKey).toStrictEqual(USER_QUERY_KEYS.ADMIN.TEAM)
  })
})

describe("searchTeamCandidates", () => {
  it("finds customer accounts by a part of their e-mail address or name, with what keeps one from becoming an admin", async () => {
    await expect(searchTeamCandidates({ data: { search: "MARTE.test" } })).resolves.toStrictEqual([
      {
        banned: false,
        email: ACCOUNT.CELINA.email,
        emailVerified: true,
        id: ACCOUNT.CELINA.id,
        name: ACCOUNT.CELINA.name,
        twoFactorEnabled: false,
      },
      {
        banned: false,
        email: ACCOUNT.DAREK.email,
        emailVerified: false,
        id: ACCOUNT.DAREK.id,
        name: ACCOUNT.DAREK.name,
        twoFactorEnabled: false,
      },
      { banned: true, email: ACCOUNT.EWA.email, emailVerified: true, id: ACCOUNT.EWA.id, name: ACCOUNT.EWA.name, twoFactorEnabled: false },
    ])
    await expect(searchTeamCandidates({ data: { search: "klientka" } })).resolves.toMatchObject([{ id: ACCOUNT.CELINA.id }])
  })

  it("leaves out the admins, who are on the team already", async () => {
    await expect(searchTeamCandidates({ data: { search: "admin" } })).resolves.toStrictEqual([])
  })

  it("shows at most eight accounts", async () => {
    for (const index of [1, 2, 3, 4, 5, 6, 7, 8]) {
      insertAccount({ email: `shopper${String(index)}@marte.test`, id: `shopper-${String(index)}`, name: `Shopper ${String(index)}` })
    }

    await expect(searchTeamCandidates({ data: { search: "@marte" } })).resolves.toHaveLength(8)
  })

  it("asks for at least three characters", async () => {
    await expect(searchTeamCandidates({ data: { search: " ce " } })).rejects.toMatchObject({ code: ERROR_CODES.VALIDATION })
  })

  it("is the candidate query the add-admin dialog runs, keyed by what was typed under the team", async () => {
    const queryClient = new QueryClient()

    await expect(queryClient.query(searchTeamCandidatesQuery("celina"))).resolves.toHaveLength(1)
    expect(searchTeamCandidatesQuery("celina").queryKey).toStrictEqual([...USER_QUERY_KEYS.ADMIN.TEAM_CANDIDATES, "celina"])
  })
})

describe("grantAdminAccess", () => {
  it("makes a verified customer an admin, refreshes open admin tabs and records who did it", async () => {
    await expect(grantAdminAccess({ data: { userId: ACCOUNT.CELINA.id } })).resolves.toStrictEqual({ userId: ACCOUNT.CELINA.id })

    expect(roles()[ACCOUNT.CELINA.id]).toBe(ROLES.ADMIN)
    expect(sessionIds()).toContain("celina-phone")
    expect(effects.invalidate).toHaveBeenCalledOnce()
    expect(effects.audit).toHaveBeenCalledExactlyOnceWith(AUDIT_LOG_ACTION.TEAM_ADMIN_GRANTED, `actor:${ACCOUNT.CELINA.id}`, {
      actor: `actor:${ACCOUNT.ADA.id}`,
      ip: "203.0.113.5",
    })
  })

  it.each([
    {
      code: ERROR_CODES.CONFLICT,
      name: "an account whose e-mail address is not verified",
      reason: TEAM_ERROR.EMAIL_NOT_VERIFIED,
      userId: ACCOUNT.DAREK.id,
    },
    { code: ERROR_CODES.CONFLICT, name: "a banned account", reason: TEAM_ERROR.ACCOUNT_BANNED, userId: ACCOUNT.EWA.id },
    { code: ERROR_CODES.CONFLICT, name: "an account that is an admin already", reason: TEAM_ERROR.ALREADY_ADMIN, userId: ACCOUNT.BOGNA.id },
    { code: ERROR_CODES.NOT_FOUND, name: "an account that does not exist", reason: TEAM_ERROR.NOT_FOUND, userId: "user-missing" },
    { code: ERROR_CODES.FORBIDDEN, name: "the caller's own account", reason: TEAM_ERROR.OWN_ACCESS, userId: ACCOUNT.ADA.id },
  ])("refuses $name and changes nothing", async ({ code, reason, userId }) => {
    const before = roles()

    await expect(grantAdminAccess({ data: { userId } })).rejects.toMatchObject({ code, message: reason })

    expect(roles()).toStrictEqual(before)
    expect(effects.invalidate).not.toHaveBeenCalled()
    expect(effects.audit).not.toHaveBeenCalled()
  })

  it("asks an admin who signed in more than a day ago to sign in again first", async () => {
    signedInAs(ACCOUNT.ADA, { hoursAgo: 24 })

    await expect(grantAdminAccess({ data: { userId: ACCOUNT.CELINA.id } })).rejects.toMatchObject({
      code: ERROR_CODES.AUTH_API_ERROR,
      message: "sessionNotFresh",
    })
    expect(roles()[ACCOUNT.CELINA.id]).toBe(ROLES.CUSTOMER)
  })

  it.each([
    { name: "a customer", session: { role: ROLES.CUSTOMER, twoFactorEnabled: false } },
    { name: "an admin without two-factor authentication", session: { role: ROLES.ADMIN, twoFactorEnabled: false } },
  ])("is closed to $name", async ({ session }) => {
    signedInAs(ACCOUNT.CELINA, session)

    await expect(grantAdminAccess({ data: { userId: ACCOUNT.DAREK.id } })).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
    expect(roles()[ACCOUNT.DAREK.id]).toBe(ROLES.CUSTOMER)
  })

  it("is the mutation the add-admin dialog runs", async () => {
    const observer = new MutationObserver(new QueryClient(), grantAdminAccessMutation)

    await expect(observer.mutate({ userId: ACCOUNT.CELINA.id })).resolves.toStrictEqual({ userId: ACCOUNT.CELINA.id })
    expect(grantAdminAccessMutation.mutationKey).toStrictEqual(USER_MUTATION_KEYS.GRANT_ADMIN_ACCESS)
  })
})

describe("revokeAdminAccess", () => {
  it("turns another admin back into a customer, signs them out everywhere and records who did it", async () => {
    await expect(revokeAdminAccess({ data: { userId: ACCOUNT.BOGNA.id } })).resolves.toStrictEqual({ userId: ACCOUNT.BOGNA.id })

    expect(roles()[ACCOUNT.BOGNA.id]).toBe(ROLES.CUSTOMER)
    expect(sessionIds()).toStrictEqual(["ada-laptop", "celina-phone"])
    expect(effects.invalidate).toHaveBeenCalledOnce()
    expect(effects.audit).toHaveBeenCalledExactlyOnceWith(AUDIT_LOG_ACTION.TEAM_ADMIN_REVOKED, `actor:${ACCOUNT.BOGNA.id}`, {
      actor: `actor:${ACCOUNT.ADA.id}`,
      ip: "203.0.113.5",
    })
  })

  it.each([
    { code: ERROR_CODES.FORBIDDEN, name: "the caller's own access", reason: TEAM_ERROR.OWN_ACCESS, userId: ACCOUNT.ADA.id },
    { code: ERROR_CODES.CONFLICT, name: "an account that is not an admin", reason: TEAM_ERROR.NOT_ADMIN, userId: ACCOUNT.CELINA.id },
    { code: ERROR_CODES.NOT_FOUND, name: "an account that does not exist", reason: TEAM_ERROR.NOT_FOUND, userId: "user-missing" },
  ])("refuses $name and signs nobody out", async ({ code, reason, userId }) => {
    const before = roles()

    await expect(revokeAdminAccess({ data: { userId } })).rejects.toMatchObject({ code, message: reason })

    expect(roles()).toStrictEqual(before)
    expect(sessionIds()).toHaveLength(4)
    expect(effects.audit).not.toHaveBeenCalled()
  })

  it("never removes the last admin: an admin whose own access was removed in the meantime cannot remove the other one", async () => {
    sqlite.prepare("update user set role = 'customer' where id = ?").run(ACCOUNT.ADA.id)

    await expect(revokeAdminAccess({ data: { userId: ACCOUNT.BOGNA.id } })).rejects.toMatchObject({
      code: ERROR_CODES.CONFLICT,
      message: TEAM_ERROR.LAST_ADMIN,
    })
    expect(roles()[ACCOUNT.BOGNA.id]).toBe(ROLES.ADMIN)
    expect(sessionIds()).toContain("bogna-phone")
  })

  it("asks an admin who signed in more than a day ago to sign in again first", async () => {
    signedInAs(ACCOUNT.ADA, { hoursAgo: 30 })

    await expect(revokeAdminAccess({ data: { userId: ACCOUNT.BOGNA.id } })).rejects.toMatchObject({ message: "sessionNotFresh" })
    expect(roles()[ACCOUNT.BOGNA.id]).toBe(ROLES.ADMIN)
  })

  it("is the mutation the remove-access dialog runs", async () => {
    const observer = new MutationObserver(new QueryClient(), revokeAdminAccessMutation)

    await expect(observer.mutate({ userId: ACCOUNT.BOGNA.id })).resolves.toStrictEqual({ userId: ACCOUNT.BOGNA.id })
    expect(revokeAdminAccessMutation.mutationKey).toStrictEqual(USER_MUTATION_KEYS.REVOKE_ADMIN_ACCESS)
  })
})
