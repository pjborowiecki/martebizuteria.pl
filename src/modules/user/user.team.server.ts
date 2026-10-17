import { and, asc, eq, exists, isNull, max, ne, or } from "drizzle-orm"
import { alias } from "drizzle-orm/sqlite-core"

import { ROLES } from "~/src/integrations/better-auth/auth.access"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { buildAdminSearchOrCondition } from "~/src/modules/_core/utils/search-conditions.server"
import { CREDENTIAL_PROVIDER_ID, GOOGLE_PROVIDER_ID } from "~/src/modules/account/account.constants"
import { account } from "~/src/modules/account/account.schema"
import { AUDIT_LOG_ACTION } from "~/src/modules/audit-log/audit-log.constants"
import { auditLog } from "~/src/modules/audit-log/audit-log.schema"
import { session } from "~/src/modules/session/session.schema"
import { TEAM_CANDIDATE_LIMIT } from "~/src/modules/user/user.constants"
import { user } from "~/src/modules/user/user.schema"

const actingAdmin = alias(user, "acting_admin")

const changedAccount = { email: user.email, id: user.id, name: user.name, role: user.role }

const notBanned = or(isNull(user.banned), eq(user.banned, false))

const hasSignInMethod = (providerId: string) => {
  const signInMethods = db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, user.id), eq(account.providerId, providerId)))

  return exists(signInMethods).mapWith(Boolean)
}

const signInEntries = and(eq(auditLog.resourceId, user.id), eq(auditLog.action, AUDIT_LOG_ACTION.AUTH_LOGIN))

export const listAdminTeamRows = () =>
  db
    .select({
      email: user.email,
      hasGoogle: hasSignInMethod(GOOGLE_PROVIDER_ID),
      hasPassword: hasSignInMethod(CREDENTIAL_PROVIDER_ID),
      id: user.id,
      lastSignInAt: max(auditLog.createdAt),
      name: user.name,
      twoFactorEnabled: user.twoFactorEnabled,
    })
    .from(user)
    .leftJoin(auditLog, signInEntries)
    .where(eq(user.role, ROLES.ADMIN))
    .groupBy(user.id)
    .orderBy(asc(user.name), asc(user.email))

export const searchTeamCandidateRows = (search: string) =>
  db
    .select({
      banned: user.banned,
      email: user.email,
      emailVerified: user.emailVerified,
      id: user.id,
      name: user.name,
      twoFactorEnabled: user.twoFactorEnabled,
    })
    .from(user)
    .where(and(eq(user.role, ROLES.CUSTOMER), buildAdminSearchOrCondition(search, [user.email, user.name])))
    .orderBy(asc(user.email))
    .limit(TEAM_CANDIDATE_LIMIT)

export const grantAdminRole = async (userId: string) => {
  const [granted] = await db
    .update(user)
    .set({ role: ROLES.ADMIN })
    .where(and(eq(user.id, userId), eq(user.role, ROLES.CUSTOMER), eq(user.emailVerified, true), notBanned))
    .returning(changedAccount)

  return granted
}

export const revokeAdminRole = async ({ actorId, userId }: Readonly<{ actorId: string; userId: string }>) => {
  const keptAdmin = db
    .select({ id: actingAdmin.id })
    .from(actingAdmin)
    .where(and(eq(actingAdmin.id, actorId), ne(actingAdmin.id, userId), eq(actingAdmin.role, ROLES.ADMIN)))
  const [revoked] = await db
    .update(user)
    .set({ role: ROLES.CUSTOMER })
    .where(and(eq(user.id, userId), eq(user.role, ROLES.ADMIN), exists(keptAdmin)))
    .returning(changedAccount)
  if (revoked !== undefined) {
    await db.delete(session).where(eq(session.userId, userId))
  }

  return revoked
}
