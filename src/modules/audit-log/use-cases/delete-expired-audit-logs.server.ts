import { and, inArray, lt, or } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"

const CUSTOMER_ACTIVITY_ACTIONS = [
  AUDIT_LOG_ACTION.CUSTOMER_CART_ABANDONED,
  AUDIT_LOG_ACTION.CUSTOMER_CART_ITEM_ADDED,
  AUDIT_LOG_ACTION.CUSTOMER_PAGE_VIEWED,
]

const SIGN_IN_HISTORY_ACTIONS = [AUDIT_LOG_ACTION.AUTH_LOGIN, AUDIT_LOG_ACTION.AUTH_LOGIN_FAILED, AUDIT_LOG_ACTION.AUTH_LOGOUT]

export const deleteExpiredAuditLogs = async ({
  customerActivityBefore,
  entryBefore,
  limit,
  signInHistoryBefore,
}: DeleteExpiredAuditLogsInput): Promise<number> => {
  const expiredCustomerActivity = and(inArray(auditLog.action, CUSTOMER_ACTIVITY_ACTIONS), lt(auditLog.createdAt, customerActivityBefore))
  const expiredSignInHistory = and(inArray(auditLog.action, SIGN_IN_HISTORY_ACTIONS), lt(auditLog.createdAt, signInHistoryBefore))
  const expired = db
    .select({ id: auditLog.id })
    .from(auditLog)
    .where(or(expiredCustomerActivity, expiredSignInHistory, lt(auditLog.createdAt, entryBefore)))
    .limit(limit)
  const deleted = await db.delete(auditLog).where(inArray(auditLog.id, expired)).returning({ id: auditLog.id })

  return deleted.length
}

export interface DeleteExpiredAuditLogsInput {
  readonly customerActivityBefore: Date
  readonly entryBefore: Date
  readonly limit: number
  readonly signInHistoryBefore: Date
}
