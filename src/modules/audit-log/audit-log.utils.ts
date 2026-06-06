import { DEFAULT_LOCALE } from "~/src/constants/_constants/locales";

import {
  AUDIT_LOG_CATEGORIES,
  AUDIT_LOG_CATEGORY_FILTER,
  AUDIT_LOG_DATE_RANGE,
  AUDIT_LOG_DATE_RANGE_MS,
  type AuditLogActorRole,
  type AuditLogCategory,
  type AuditLogCategoryFilter,
  type AuditLogDateRange
} from "~/src/modules/audit-log/audit-log.constants";
import type { AuditLog } from "~/src/modules/audit-log/audit-log.types";
import { resolveAdminCustomerInitials } from "~/src/modules/user/user.utils";

const EMPTY_LENGTH = 0;
const START_OF_DAY_HOUR = 0;
const START_OF_DAY_MINUTE = 0;
const START_OF_DAY_SECOND = 0;
const START_OF_DAY_MILLISECOND = 0;

export function isAuditLogCategoryFilter(value: string): value is AuditLogCategoryFilter {
  return value === AUDIT_LOG_CATEGORY_FILTER.ALL || (AUDIT_LOG_CATEGORIES as readonly string[]).includes(value);
}

export function resolveAuditLogCategoryFilter(value: AuditLogCategoryFilter | undefined): AuditLogCategory | undefined {
  if (value === undefined || value === AUDIT_LOG_CATEGORY_FILTER.ALL) {
    return undefined;
  }

  return value;
}

export function resolveStartOfToday(): Date {
  const startOfDay = new Date();
  startOfDay.setHours(START_OF_DAY_HOUR, START_OF_DAY_MINUTE, START_OF_DAY_SECOND, START_OF_DAY_MILLISECOND);
  return startOfDay;
}

export function resolveAuditLogSince(dateRange: AuditLogDateRange | undefined): Date | undefined {
  if (dateRange === undefined || dateRange === AUDIT_LOG_DATE_RANGE.ALL) {
    return undefined;
  }

  const now = Date.now();

  if (dateRange === AUDIT_LOG_DATE_RANGE.TODAY) {
    return resolveStartOfToday();
  }

  if (dateRange === AUDIT_LOG_DATE_RANGE.DAYS_7) {
    return new Date(now - AUDIT_LOG_DATE_RANGE_MS.DAYS_7);
  }

  return new Date(now - AUDIT_LOG_DATE_RANGE_MS.DAYS_30);
}

export function formatAdminAuditTimestamp(createdAt: Date | string): string {
  const date = createdAt instanceof Date ? createdAt : new Date(createdAt);
  return date.toLocaleString(DEFAULT_LOCALE, {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
    second: "2-digit",
    year: "numeric"
  });
}

interface AuditLogListSourceRow {
  readonly action: string;
  readonly actorId: string | null;
  readonly actorName: string;
  readonly actorRole: AuditLogActorRole;
  readonly category: AuditLog["select"]["category"];
  readonly createdAt: Date;
  readonly detail: string | null;
  readonly id: string;
  readonly ip: string | null;
  readonly severity: AuditLog["select"]["severity"];
  readonly target: string;
}

export function toAdminAuditListItem(row: AuditLogListSourceRow): AuditLog["adminListItem"] {
  return {
    action: row.action,
    actor: {
      id: row.actorId ?? undefined,
      initials: resolveAdminCustomerInitials(row.actorName),
      name: row.actorName,
      role: row.actorRole
    },
    category: row.category,
    detail: row.detail ?? undefined,
    id: row.id,
    ip: row.ip ?? undefined,
    severity: row.severity,
    target: row.target,
    timestamp: formatAdminAuditTimestamp(row.createdAt)
  };
}

export function serializeAuditMetadata(metadata: Record<string, unknown> | undefined): string | undefined {
  if (metadata === undefined || Object.keys(metadata).length === EMPTY_LENGTH) {
    return undefined;
  }

  return JSON.stringify(metadata);
}
