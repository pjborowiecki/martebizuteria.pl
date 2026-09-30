import { type SQL, and, count, desc, eq, gte, inArray } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { type DateTimeColumnFilterValue } from "~/src/modules/_core/utils/datetime-column-filter"
import { buildAdminDateTimeFilterSql } from "~/src/modules/_core/utils/datetime-column-filter.server"
import { type ListPaginationParams } from "~/src/modules/_core/utils/pagination"
import { buildAdminSearchOrCondition } from "~/src/modules/_core/utils/search-conditions.server"
import { type AuditLogCategory, type AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { type AuditLog } from "~/src/modules/audit-log/audit-log.types"

export interface AdminAuditLogsListParams extends ListPaginationParams {
  readonly category?: AuditLogCategory | undefined
  readonly createdAt?: DateTimeColumnFilterValue | undefined
  readonly search?: string | undefined
  readonly severity?: AuditLogSeverity | undefined
}

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

const buildAdminAuditLogsWhere = (
  params: Pick<AdminAuditLogsListParams, "category" | "createdAt" | "search" | "severity">,
): SQL | undefined => {
  const conditions: SQL[] = []

  if (params.createdAt !== undefined) {
    conditions.push(buildAdminDateTimeFilterSql(auditLog.createdAt, params.createdAt))
  }

  if (params.severity !== undefined) {
    conditions.push(eq(auditLog.severity, params.severity))
  }

  if (params.category !== undefined) {
    conditions.push(eq(auditLog.category, params.category))
  }

  const searchCondition = buildAdminSearchOrCondition(params.search, [
    auditLog.action,
    auditLog.target,
    auditLog.detail,
    auditLog.actorName,
    auditLog.ip,
  ])

  if (searchCondition !== undefined) {
    conditions.push(searchCondition)
  }

  if (conditions.length === 0) {
    return undefined
  }

  return and(...conditions)
}

const selectAdminAuditLogRows = (params: AdminAuditLogsListParams) => {
  const whereClause = buildAdminAuditLogsWhere(params)

  return db
    .select(adminAuditLogListColumns)
    .from(auditLog)
    .where(whereClause)
    .orderBy(desc(auditLog.createdAt))
    .limit(params.limit)
    .offset(params.offset)
}

const countAdminAuditLogRows = (params: Pick<AdminAuditLogsListParams, "category" | "createdAt" | "search" | "severity">) => {
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

export const getAdminAuditLogStats = async (sinceToday: Date): Promise<AuditLog["stats"]> => {
  const [[totalRow], [todayRow], [warningRow], [errorRow]] = await db.batch([
    db.select({ count: count() }).from(auditLog),
    db.select({ count: count() }).from(auditLog).where(gte(auditLog.createdAt, sinceToday)),
    db.select({ count: count() }).from(auditLog).where(eq(auditLog.severity, "warning")),
    db.select({ count: count() }).from(auditLog).where(eq(auditLog.severity, "error")),
  ])

  return {
    errorCount: errorRow?.count ?? 0,
    todayCount: todayRow?.count ?? 0,
    totalCount: totalRow?.count ?? 0,
    warningCount: warningRow?.count ?? 0,
  }
}

export const insertAuditLogs = async (rows: readonly AuditLogInsertRow[]): Promise<void> => {
  if (rows.length === 0) {
    return
  }

  await db.insert(auditLog).values(
    rows.map((row) => ({
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
}

export const deleteAuditLogs = async (ids: readonly string[]): Promise<number> => {
  if (ids.length === 0) {
    return 0
  }

  await db.delete(auditLog).where(inArray(auditLog.id, [...ids]))

  return ids.length
}
