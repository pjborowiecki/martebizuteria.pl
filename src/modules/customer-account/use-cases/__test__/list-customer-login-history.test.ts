import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import {
  listCustomerLoginHistory,
  listCustomerLoginHistoryQuery,
} from "~/src/modules/customer-account/use-cases/list-customer-login-history"

interface AuditRow {
  readonly action: string
  readonly createdAt: Date
  readonly ip: string | null
}

const CALLER_CONTEXT = { auth: { session: { id: "session-current" }, user: { id: "customer-1" } } }

const accessors = vi.hoisted(() => ({
  getCustomerLoginAuditRows: vi.fn(),
}))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/customer-account/customer-account.accessors.server", () => accessors)
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler: (handler: (options: { context: typeof CALLER_CONTEXT }) => unknown) => () => handler({ context: CALLER_CONTEXT }),
      middleware: () => builder,
      validator: () => builder,
    }

    return builder
  },
}))

const auditRow = (overrides: Partial<AuditRow> = {}): AuditRow => ({
  action: AUDIT_LOG_ACTION.AUTH_LOGIN,
  createdAt: new Date("2026-03-01T12:00:00.000Z"),
  ip: "198.51.100.7",
  ...overrides,
})

const withAuditRows = (rows: readonly AuditRow[]) => {
  accessors.getCustomerLoginAuditRows.mockResolvedValue([...rows])
}

describe("listCustomerLoginHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("asks for the sign-in trail of the authenticated customer only", async () => {
    withAuditRows([])

    await expect(listCustomerLoginHistory()).resolves.toStrictEqual([])
    expect(accessors.getCustomerLoginAuditRows).toHaveBeenCalledWith("customer-1")
  })

  it("reports a successful sign in with the address it came from", async () => {
    withAuditRows([auditRow()])

    await expect(listCustomerLoginHistory()).resolves.toStrictEqual([
      { createdAt: new Date("2026-03-01T12:00:00.000Z"), ipAddress: "198.51.100.7", status: "success" },
    ])
  })

  it("reports a rejected sign in as a failed attempt, so a guessed password is visible", async () => {
    withAuditRows([auditRow({ action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED })])

    const history = await listCustomerLoginHistory()

    expect(history[0]?.status).toBe("failed")
  })

  it("keeps the order the audit trail returned", async () => {
    withAuditRows([
      auditRow({ action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED, createdAt: new Date("2026-03-03T12:00:00.000Z") }),
      auditRow({ createdAt: new Date("2026-03-02T12:00:00.000Z") }),
    ])

    const history = await listCustomerLoginHistory()

    expect(history.map((entry) => entry.createdAt)).toStrictEqual([
      new Date("2026-03-03T12:00:00.000Z"),
      new Date("2026-03-02T12:00:00.000Z"),
    ])
  })

  it("leaves the address out when the audit row recorded none", async () => {
    withAuditRows([auditRow({ ip: null })])

    const history = await listCustomerLoginHistory()

    expect(history[0]?.ipAddress).toBeUndefined()
  })
})

describe("listCustomerLoginHistoryQuery", () => {
  it("uses the shared login history key and stale window", () => {
    const options = listCustomerLoginHistoryQuery()

    expect(options.queryKey).toStrictEqual(CUSTOMER_ACCOUNT_QUERY_KEYS.LOGIN_HISTORY)
    expect(options.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })

  it("loads the authenticated customer's history through the cache query", async () => {
    withAuditRows([auditRow()])

    await expect(new QueryClient().query(listCustomerLoginHistoryQuery())).resolves.toStrictEqual([
      { createdAt: new Date("2026-03-01T12:00:00.000Z"), ipAddress: "198.51.100.7", status: "success" },
    ])
    expect(accessors.getCustomerLoginAuditRows).toHaveBeenLastCalledWith("customer-1")
  })
})
