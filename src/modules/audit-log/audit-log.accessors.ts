import { and, count, desc, eq, gte, inArray, type SQL } from "drizzle-orm";

import { db } from "~/src/integrations/drizzle-orm/drizzle.database";

import type { DateTimeColumnFilterValue } from "~/src/lib/_utils/admin-datetime-filter";
import { buildAdminDateTimeFilterSql } from "~/src/lib/_utils/admin-datetime-filter.server";
import { buildAdminSearchOrCondition } from "~/src/lib/_utils/admin-search.server";
import type { ListPaginationParams } from "~/src/lib/_utils/list-pagination";

import type { AuditLogCategory, AuditLogSeverity } from "~/src/modules/audit-log/audit-log.constants";
import { auditLog } from "~/src/modules/audit-log/audit-log.schema";
import type { AuditLog } from "~/src/modules/audit-log/audit-log.types";

const EMPTY_LENGTH = 0;
const ZERO_COUNT = 0;

export interface AdminAuditLogsListParams extends ListPaginationParams {
  readonly category?: AuditLogCategory;
  readonly createdAt?: DateTimeColumnFilterValue;
  readonly search?: string;
  readonly severity?: AuditLogSeverity;
}

export interface AuditLogInsertRow {
  readonly action: string;
  readonly actorId?: string;
  readonly actorName: string;
  readonly actorRole: (typeof auditLog.$inferSelect)["actorRole"];
  readonly category: AuditLogCategory;
  readonly createdAt: number;
  readonly detail?: string;
  readonly id: string;
  readonly ip?: string;
  readonly metadata?: string;
  readonly resourceId?: string;
  readonly severity: AuditLogSeverity;
  readonly target: string;
}

export interface AdminAuditLogsPageAccessorResult {
  readonly rows: Awaited<ReturnType<typeof selectAdminAuditLogRows>>;
  readonly total?: number;
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
  target: auditLog.target
} as const;

function buildAdminAuditLogsWhere(
  params: Pick<AdminAuditLogsListParams, "category" | "createdAt" | "search" | "severity">
): SQL | undefined {
  const conditions: SQL[] = [];

  if (params.createdAt !== undefined) {
    conditions.push(buildAdminDateTimeFilterSql(auditLog.createdAt, params.createdAt));
  }

  if (params.severity !== undefined) {
    conditions.push(eq(auditLog.severity, params.severity));
  }

  if (params.category !== undefined) {
    conditions.push(eq(auditLog.category, params.category));
  }

  const searchCondition = buildAdminSearchOrCondition(params.search, [
    auditLog.action,
    auditLog.target,
    auditLog.detail,
    auditLog.actorName,
    auditLog.ip
  ]);
  if (searchCondition !== undefined) {
    conditions.push(searchCondition);
  }

  if (conditions.length === EMPTY_LENGTH) {
    return undefined;
  }

  return and(...conditions);
}

function selectAdminAuditLogRows(params: AdminAuditLogsListParams) {
  const whereClause = buildAdminAuditLogsWhere(params);

  return db
    .select(adminAuditLogListColumns)
    .from(auditLog)
    .where(whereClause)
    .orderBy(desc(auditLog.createdAt))
    .limit(params.limit)
    .offset(params.offset);
}

function countAdminAuditLogRows(params: Pick<AdminAuditLogsListParams, "category" | "createdAt" | "search" | "severity">) {
  const whereClause = buildAdminAuditLogsWhere(params);

  return db.select({ count: count() }).from(auditLog).where(whereClause);
}

async function getAdminAuditLogsPage(params: AdminAuditLogsListParams): Promise<AdminAuditLogsPageAccessorResult> {
  const rowsQuery = selectAdminAuditLogRows(params);

  if (params.offset > ZERO_COUNT) {
    const rows = await rowsQuery;
    return { rows };
  }

  const [[countRow], rows] = await db.batch([countAdminAuditLogRows(params), rowsQuery]);

  return {
    rows,
    total: countRow?.count ?? ZERO_COUNT
  };
}

async function getAdminAuditLogStats(sinceToday: Date): Promise<AuditLog["stats"]> {
  const [[totalRow], [todayRow], [warningRow], [errorRow]] = await db.batch([
    db.select({ count: count() }).from(auditLog),
    db.select({ count: count() }).from(auditLog).where(gte(auditLog.createdAt, sinceToday)),
    db.select({ count: count() }).from(auditLog).where(eq(auditLog.severity, "warning")),
    db.select({ count: count() }).from(auditLog).where(eq(auditLog.severity, "error"))
  ]);

  return {
    errorCount: errorRow?.count ?? ZERO_COUNT,
    todayCount: todayRow?.count ?? ZERO_COUNT,
    totalCount: totalRow?.count ?? ZERO_COUNT,
    warningCount: warningRow?.count ?? ZERO_COUNT
  };
}

async function insertAuditLogs(rows: readonly AuditLogInsertRow[]): Promise<void> {
  if (rows.length === EMPTY_LENGTH) {
    return;
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
      target: row.target
    }))
  );
}

async function deleteAuditLogs(ids: readonly string[]): Promise<number> {
  if (ids.length === EMPTY_LENGTH) {
    return ZERO_COUNT;
  }

  await db.delete(auditLog).where(inArray(auditLog.id, [...ids]));
  return ids.length;
}

export const auditLogAccessors = {
  deleteAuditLogs,
  getAdminAuditLogStats,
  getAdminAuditLogsPage,
  insertAuditLogs
};
