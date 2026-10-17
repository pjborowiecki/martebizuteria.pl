import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { CUSTOMER_ACCOUNT_QUERY_KEYS, CUSTOMER_ACCOUNT_QUERY_STALE_MS } from "~/src/modules/customer-account/customer-account.constants"
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"
import {
  getCustomerLoginHistoryPage,
  getCustomerLoginHistoryPageQuery,
} from "~/src/modules/customer-account/use-cases/get-customer-login-history-page"

interface AuditRow {
  readonly action: string
  readonly createdAt: Date
  readonly id: string
  readonly ip: string | null
}

const CALLER_CONTEXT = { auth: { session: { id: "session-current" }, user: { id: "customer-1" } } }

const accessors = vi.hoisted(() => ({
  getCustomerLoginAuditPage: vi.fn(),
}))

const validation = vi.hoisted(() => ({ parse: (input: unknown): unknown => input }))

vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/modules/customer-account/customer-account.accessors.server", () => accessors)
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = {
      handler:
        (handler: (options: { context: typeof CALLER_CONTEXT; data: unknown }) => unknown) =>
        ({ data }: { data: unknown }) =>
          handler({ context: CALLER_CONTEXT, data: validation.parse(data) }),
      middleware: () => builder,
      validator: (parse: (input: unknown) => unknown) => {
        validation.parse = parse

        return builder
      },
    }

    return builder
  },
}))

const auditRow = (overrides: Partial<AuditRow> = {}): AuditRow => ({
  action: AUDIT_LOG_ACTION.AUTH_LOGIN,
  createdAt: new Date("2026-03-01T12:00:00.000Z"),
  id: "audit-1",
  ip: "198.51.100.7",
  ...overrides,
})

const withAuditPage = (rows: readonly AuditRow[], total = rows.length) => {
  accessors.getCustomerLoginAuditPage.mockResolvedValue({ rows: [...rows], total })
}

describe("getCustomerLoginHistoryPage", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("asks for the first ten sign-in attempts of the authenticated customer only", async () => {
    withAuditPage([])

    await expect(getCustomerLoginHistoryPage({ data: {} })).resolves.toStrictEqual({
      hasMore: false,
      items: [],
      limit: 10,
      offset: 0,
      total: 0,
    })
    expect(accessors.getCustomerLoginAuditPage).toHaveBeenCalledWith({
      limit: 10,
      offset: 0,
      search: undefined,
      status: undefined,
      userId: "customer-1",
    })
  })

  it("asks for the page, size, address search and result the caller picked", async () => {
    withAuditPage([], 60)

    await expect(
      getCustomerLoginHistoryPage({ data: { page: 3, pageSize: 25, search: "  198.51 ", status: "failed" } }),
    ).resolves.toMatchObject({ offset: 50, total: 60 })
    expect(accessors.getCustomerLoginAuditPage).toHaveBeenCalledWith({
      limit: 25,
      offset: 50,
      search: "198.51",
      status: "failed",
      userId: "customer-1",
    })
  })

  it("refuses a result other than a successful or failed sign-in", () => {
    expect(customerAccountZodSchemas.loginHistoryPageInput.safeParse({ status: "logout" }).success).toBe(false)
  })

  it("reports a successful sign-in with the address it came from, and says when more pages follow", async () => {
    withAuditPage([auditRow()], 11)

    await expect(getCustomerLoginHistoryPage({ data: {} })).resolves.toStrictEqual({
      hasMore: true,
      items: [{ createdAt: new Date("2026-03-01T12:00:00.000Z"), id: "audit-1", ipAddress: "198.51.100.7", status: "success" }],
      limit: 10,
      offset: 0,
      total: 11,
    })
  })

  it("reports a rejected sign-in as a failed attempt and leaves out an address the audit row did not record", async () => {
    withAuditPage([auditRow({ action: AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED, ip: null })])

    const page = await getCustomerLoginHistoryPage({ data: {} })

    expect(page.items[0]).toStrictEqual({
      createdAt: new Date("2026-03-01T12:00:00.000Z"),
      id: "audit-1",
      ipAddress: undefined,
      status: "failed",
    })
  })
})

describe("getCustomerLoginHistoryPageQuery", () => {
  it("keys each page under the shared login history key with the shared stale window", () => {
    const options = getCustomerLoginHistoryPageQuery({ page: 2, pageSize: 10 })

    expect(options.queryKey).toStrictEqual([...CUSTOMER_ACCOUNT_QUERY_KEYS.LOGIN_HISTORY, { page: 2, pageSize: 10 }])
    expect(options.staleTime).toBe(CUSTOMER_ACCOUNT_QUERY_STALE_MS)
  })

  it("loads the page through the cache query", async () => {
    withAuditPage([auditRow()])

    await expect(new QueryClient().query(getCustomerLoginHistoryPageQuery({ page: 1 }))).resolves.toMatchObject({ total: 1 })
    expect(accessors.getCustomerLoginAuditPage).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 0, userId: "customer-1" }))
  })
})
