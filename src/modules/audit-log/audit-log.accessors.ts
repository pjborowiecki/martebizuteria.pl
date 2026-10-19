import { type SQL, and, count, desc, eq, gte, inArray, lt, lte, or } from "drizzle-orm"

import { insertRowChunks, runDrizzleBatch } from "~/src/integrations/drizzle-orm/drizzle.batch"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { inJsonList } from "~/src/integrations/drizzle-orm/drizzle.utils"

import { type DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"
import { buildAdminDateTimeFilterSql } from "~/src/modules/_core/utils/datetime-column-filter.server"
import { type ListPaginationParams } from "~/src/modules/_core/utils/pagination"
import {
  buildAdminSearchOrCondition,
  containsAdminSearchTerm,
  normalizeAdminSearchTerm,
} from "~/src/modules/_core/utils/search-conditions.server"
import {
  AUDIT_LOG_ACTION,
  type AuditLogCategory,
  type AuditLogSeverity,
  CUSTOMER_ACCOUNT_LOGIN_STATUS,
  type CustomerAccountLoginStatus,
} from "~/src/modules/audit-log/audit-log.constants"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"
import { buildAuditLogDayFilter } from "~/src/modules/audit-log/audit-log.utils"
import {
  accountsWithAddressContaining,
  addressesOfAccountsWithAddressContaining,
} from "~/src/modules/user-email-history/user-email-history.accessors"
import { CUSTOMER_AUDIT_TIMELINE_LIMIT } from "~/src/modules/user/user.constants"

export interface AdminAuditLogsFilterParams {
  readonly category?: AuditLogCategory | undefined
  readonly createdAt?: DateTimeColumnFilterValue | undefined
  readonly search?: string | undefined
  readonly severity?: AuditLogSeverity | undefined
  readonly timeZone: string
  readonly until?: Date | undefined
}

export interface AdminAuditLogsListParams extends AdminAuditLogsFilterParams, ListPaginationParams {}

export const buildAdminAuditLogsFilterParams = (
  input: Pick<AdminAuditLogsFilterParams, "category" | "createdAt" | "search" | "severity">,
  timeZone: string,
): AdminAuditLogsFilterParams => ({
  category: input.category,
  createdAt: input.createdAt,
  search: normalizeAdminSearchTerm(input.search),
  severity: input.severity,
  timeZone,
})

export interface AuditLogInsertRow {
  readonly action: string
  readonly actorId?: string | undefined
  readonly actorName: string
  readonly actorRole: (typeof auditLog.$inferSelect)["actorRole"]
  readonly category: AuditLogCategory
  readonly createdAt: number
  readonly detail?: string | undefined
  readonly id: string
  readonly ip?: string | undefined
  readonly metadata?: string | undefined
  readonly resourceId?: string | undefined
  readonly severity: AuditLogSeverity
  readonly target: string
}

export interface AdminAuditLogsPageAccessorResult {
  readonly rows: Awaited<ReturnType<typeof selectAdminAuditLogRows>>
  readonly total?: number
}

const adminAuditLogListColumns = {
  action: auditLog.action,
  actorId: auditLog.actorId,
  actorName: auditLog.actorName,
  actorRole: auditLog.actorRole,
  category: auditLog.category,
  createdAt: auditLog.createdAt,
  detail: auditLog.detail,
  id: auditLog.id,
  ip: auditLog.ip,
  metadata: auditLog.metadata,
  resourceId: auditLog.resourceId,
  severity: auditLog.severity,
  target: auditLog.target,
} as const

const SEARCHED_COLUMNS = [auditLog.action, auditLog.target, auditLog.detail, auditLog.actorName, auditLog.ip]

const entriesOfAccountsWithAddressContaining = (term: string): SQL | undefined => {
  const accounts = accountsWithAddressContaining(term)

  return or(
    inArray(auditLog.resourceId, accounts),
    inArray(auditLog.actorId, accounts),
    inArray(auditLog.resourceId, addressesOfAccountsWithAddressContaining(term)),
  )
}

const buildAdminAuditLogsWhere = (params: AdminAuditLogsFilterParams): SQL | undefined => {
  const conditions: SQL[] = []

  if (params.createdAt !== undefined) {
    conditions.push(buildAdminDateTimeFilterSql(auditLog.createdAt, params.createdAt, params.timeZone))
  }

  if (params.severity !== undefined) {
    conditions.push(eq(auditLog.severity, params.severity))
  }

  if (params.category !== undefined) {
    conditions.push(eq(auditLog.category, params.category))
  }

  if (params.until !== undefined) {
    conditions.push(lte(auditLog.createdAt, params.until))
  }

  const term = normalizeAdminSearchTerm(params.search)
  if (term !== undefined) {
    conditions.push(or(buildAdminSearchOrCondition(term, SEARCHED_COLUMNS), entriesOfAccountsWithAddressContaining(term))!)
  }

  if (conditions.length === 0) {
    return undefined
  }

  return and(...conditions)
}

const selectAdminAuditLogRows = (params: AdminAuditLogsListParams) =>
  db
    .select(adminAuditLogListColumns)
    .from(auditLog)
    .where(buildAdminAuditLogsWhere(params))
    .orderBy(desc(auditLog.createdAt))
    .limit(params.limit)
    .offset(params.offset)

const countAdminAuditLogRows = (params: AdminAuditLogsFilterParams) => {
  const whereClause = buildAdminAuditLogsWhere(params)

  return db.select({ count: count() }).from(auditLog).where(whereClause)
}

export const getAdminAuditLogsPage = async (params: AdminAuditLogsListParams): Promise<AdminAuditLogsPageAccessorResult> => {
  const rowsQuery = selectAdminAuditLogRows(params)

  if (params.offset > 0) {
    const rows = await rowsQuery

    return { rows }
  }

  const [[countRow], rows] = await db.batch([countAdminAuditLogRows(params), rowsQuery])

  return {
    rows,
    total: countRow?.count ?? 0,
  }
}

export const getAdminAuditLogStats = async (today: string, timeZone: string): Promise<AuditLog["stats"]> => {
  const [[totalRow], [todayRow], [warningRow], [errorRow]] = await db.batch([
    countAdminAuditLogRows({ timeZone }),
    countAdminAuditLogRows({ createdAt: buildAuditLogDayFilter(today), timeZone }),
    countAdminAuditLogRows({ severity: "warning", timeZone }),
    countAdminAuditLogRows({ severity: "error", timeZone }),
  ])

  return {
    errorCount: errorRow?.count ?? 0,
    todayCount: todayRow?.count ?? 0,
    totalCount: totalRow?.count ?? 0,
    warningCount: warningRow?.count ?? 0,
  }
}

export const insertAuditLogs = async (rows: readonly AuditLogInsertRow[]): Promise<void> => {
  await runDrizzleBatch(
    insertRowChunks(auditLog, rows).map((chunk) =>
      db
        .insert(auditLog)
        .values(
          chunk.map((row) => ({
            action: row.action,
            actorId: row.actorId,
            actorName: row.actorName,
            actorRole: row.actorRole,
            category: row.category,
            createdAt: new Date(row.createdAt),
            detail: row.detail,
            id: row.id,
            ip: row.ip,
            metadata: row.metadata,
            resourceId: row.resourceId,
            severity: row.severity,
            target: row.target,
          })),
        )
        .onConflictDoNothing({ target: auditLog.id }),
    ),
  )
}

export const deleteAuditLogs = async (ids: readonly string[]): Promise<string[]> => {
  if (ids.length === 0) {
    return []
  }

  const deleted = await db.delete(auditLog).where(inJsonList(auditLog.id, ids)).returning({ id: auditLog.id })

  return deleted.map(({ id }) => id)
}

const NO_ROWS = 0

export const getCustomerActivityAuditRows = (userId: string, orderIds: readonly string[] = []) =>
  db
    .select({
      action: auditLog.action,
      createdAt: auditLog.createdAt,
      detail: auditLog.detail,
      metadata: auditLog.metadata,
      resourceId: auditLog.resourceId,
    })
    .from(auditLog)
    .where(and(inJsonList(auditLog.resourceId, [userId, ...orderIds]), inArray(auditLog.action, [...CUSTOMER_ACCOUNT_ACTIVITY_ACTIONS])))
    .orderBy(desc(auditLog.createdAt))
    .limit(CUSTOMER_AUDIT_TIMELINE_LIMIT)

const LOGIN_AUDIT_ACTIONS = {
  [CUSTOMER_ACCOUNT_LOGIN_STATUS.FAILED]: [AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED],
  [CUSTOMER_ACCOUNT_LOGIN_STATUS.SUCCESS]: [AUDIT_LOG_ACTION.AUTH_LOGIN],
} as const

const customerLoginAuditWhere = ({ search, status, userId }: Readonly<CustomerLoginAuditFilter>) =>
  and(
    eq(auditLog.resourceId, userId),
    inArray(
      auditLog.action,
      status === undefined ? [AUDIT_LOG_ACTION.AUTH_LOGIN, AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED] : LOGIN_AUDIT_ACTIONS[status],
    ),
    search === undefined ? undefined : containsAdminSearchTerm(auditLog.ip, search),
  )

export const getCustomerLoginAuditRows = ({ limit, offset, ...filter }: Readonly<CustomerLoginAuditFilter & ListPaginationParams>) =>
  db
    .select({
      action: auditLog.action,
      createdAt: auditLog.createdAt,
      id: auditLog.id,
      ip: auditLog.ip,
    })
    .from(auditLog)
    .where(customerLoginAuditWhere(filter))
    .orderBy(desc(auditLog.createdAt), desc(auditLog.id))
    .limit(limit)
    .offset(offset)

export const getCustomerLoginAuditPage = async (params: Readonly<CustomerLoginAuditFilter & ListPaginationParams>) => {
  const [[countRow], rows] = await db.batch([
    db.select({ count: count() }).from(auditLog).where(customerLoginAuditWhere(params)),
    getCustomerLoginAuditRows(params),
  ])

  return { rows, total: countRow?.count ?? NO_ROWS }
}

interface CustomerLoginAuditFilter {
  readonly search?: string | undefined
  readonly status?: CustomerAccountLoginStatus | undefined
  readonly userId: string
}

const CUSTOMER_ACCOUNT_ACTIVITY_ACTIONS = [
  AUDIT_LOG_ACTION.AUTH_LOGIN,
  AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED,
  AUDIT_LOG_ACTION.AUTH_LOGOUT,
  AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
  AUDIT_LOG_ACTION.ORDER_DELIVERED,
  AUDIT_LOG_ACTION.ORDER_PLACED,
  AUDIT_LOG_ACTION.ORDER_RELEASED,
  AUDIT_LOG_ACTION.ORDER_SHIPPED,
] as const

export const pageViewsQuery = (since: Date, until?: Date) => {
  const conditions = [eq(auditLog.action, AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED), gte(auditLog.createdAt, since)]
  if (until !== undefined) {
    conditions.push(lt(auditLog.createdAt, until))
  }

  return db
    .select({
      count: count(),
    })
    .from(auditLog)
    .where(and(...conditions))
}
