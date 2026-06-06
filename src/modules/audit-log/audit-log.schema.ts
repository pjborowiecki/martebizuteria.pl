import { index, sqliteTable, text } from "drizzle-orm/sqlite-core";

import { timestampNow } from "~/src/integrations/drizzle-orm/drizzle.utils";

import { AUDIT_LOG_ACTOR_ROLES, AUDIT_LOG_CATEGORIES, AUDIT_LOG_SEVERITIES } from "~/src/modules/audit-log/audit-log.constants";

export const auditLog = sqliteTable(
  "audit_log",
  {
    action: text("action").notNull(),
    actorId: text("actor_id"),
    actorName: text("actor_name").notNull(),
    actorRole: text("actor_role", { enum: AUDIT_LOG_ACTOR_ROLES }).notNull(),
    category: text("category", { enum: AUDIT_LOG_CATEGORIES }).notNull(),
    createdAt: timestampNow("created_at"),
    detail: text("detail"),
    id: text("id").primaryKey(),
    ip: text("ip"),
    metadata: text("metadata"),
    resourceId: text("resource_id"),
    severity: text("severity", { enum: AUDIT_LOG_SEVERITIES }).notNull(),
    target: text("target").notNull()
  },
  (table) => [
    index("audit_log_createdAt_idx").on(table.createdAt),
    index("audit_log_category_idx").on(table.category),
    index("audit_log_severity_idx").on(table.severity),
    index("audit_log_action_idx").on(table.action),
    index("audit_log_resource_idx").on(table.category, table.resourceId)
  ]
);
