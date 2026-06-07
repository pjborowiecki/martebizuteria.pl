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
import type { AdminAuditListItem, AuditLog } from "~/src/modules/audit-log/audit-log.types";
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
  readonly metadata: string | null;
  readonly resourceId: string | null;
  readonly severity: AuditLog["select"]["severity"];
  readonly target: string;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export interface AdminAuditTargetPresentation {
  readonly label: string;
  readonly resourceId?: string;
}

function isAuditMetadataRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAuditMetadata(metadata: string | null): Record<string, unknown> | undefined {
  if (metadata === null || metadata === "") {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(metadata);
    if (isAuditMetadataRecord(parsed)) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function resolveAdminAuditTargetPresentation({
  metadata,
  resourceId,
  target
}: {
  readonly metadata?: Record<string, unknown>;
  readonly resourceId?: string;
  readonly target: string;
}): AdminAuditTargetPresentation {
  const handleFromMetadata = typeof metadata?.handle === "string" ? metadata.handle : undefined;
  const emailFromMetadata = typeof metadata?.email === "string" ? metadata.email : undefined;

  let labelFromMetadata: string | undefined = undefined;
  if (emailFromMetadata !== undefined && emailFromMetadata !== "" && !target.includes("@")) {
    labelFromMetadata = emailFromMetadata;
  } else if (handleFromMetadata !== undefined && handleFromMetadata !== "" && UUID_PATTERN.test(target)) {
    labelFromMetadata = handleFromMetadata;
  }

  if (resourceId !== undefined && resourceId !== target) {
    return { label: labelFromMetadata ?? target, resourceId };
  }

  if (labelFromMetadata !== undefined) {
    return { label: labelFromMetadata, resourceId: target };
  }

  return { label: target };
}

export function formatAdminAuditTarget(target: string, resourceId?: string): string {
  const { label, resourceId: resolvedResourceId } = resolveAdminAuditTargetPresentation({ resourceId, target });
  if (resolvedResourceId === undefined || resolvedResourceId === label) {
    return label;
  }

  return `${label} (${resolvedResourceId})`;
}

export function toAdminAuditListItem(row: AuditLogListSourceRow): AdminAuditListItem {
  const presentation = resolveAdminAuditTargetPresentation({
    metadata: parseAuditMetadata(row.metadata),
    resourceId: row.resourceId ?? undefined,
    target: row.target
  });

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
    resourceId: presentation.resourceId,
    severity: row.severity,
    target: presentation.label,
    timestamp: formatAdminAuditTimestamp(row.createdAt)
  };
}

export function serializeAuditMetadata(metadata: Record<string, unknown> | undefined): string | undefined {
  if (metadata === undefined || Object.keys(metadata).length === EMPTY_LENGTH) {
    return undefined;
  }

  return JSON.stringify(metadata);
}
