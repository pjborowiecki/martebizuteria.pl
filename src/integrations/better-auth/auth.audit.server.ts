import { type BetterAuthPlugin } from "better-auth"
import { createAuthMiddleware, isAPIError } from "better-auth/api"
import { verifyJWT } from "better-auth/crypto"
import { type z } from "zod/v4"

import {
  ADMIN_ACCOUNT_AUDIT_PATHS,
  ADMIN_PATHS,
  CHANGE_PASSWORD_PATH,
  DISABLE_TWO_FACTOR_PATH,
  OWN_ACCOUNT_AUDIT_PATHS,
  SIGN_IN_PATH_PREFIXES,
  TWO_FACTOR_VERIFY_PATH_PREFIX,
  VERIFY_EMAIL_PATH,
  VERIFY_TOTP_PATH,
} from "~/src/integrations/better-auth/auth.constants"
import { adminAccountChangeSchema, confirmedEmailChangeSchema, passwordChangeSchema } from "~/src/integrations/better-auth/auth.zod"

import {
  type AuditEventOptions,
  recordAuthEmailChangedAudit,
  recordAuthLoginAudit,
  recordAuthPasswordChangedAudit,
  recordAuthRoleChangedAudit,
  recordAuthSessionsRevokedAudit,
  recordAuthTwoFactorDisabledAudit,
  recordAuthTwoFactorEnabledAudit,
  recordAuthUserBannedAudit,
  recordAuthUserUnbannedAudit,
  resolveAuthAuditActor,
} from "~/src/modules/audit-log/audit-log.events.server"
import { type AuditLogActorInput } from "~/src/modules/audit-log/audit-log.record.server"
import { getUserById } from "~/src/modules/user/user.accessors"

import { auditRequestIp } from "~/src/lib/request"

export const signInAudit = {
  hooks: {
    after: [
      {
        handler: createAuthMiddleware(async (ctx) => {
          const signedIn = ctx.context.newSession
          const arrivedWith = ctx.context.session
          if (signedIn === null) {
            return
          }

          const continuesExistingSignIn =
            arrivedWith !== null && (arrivedWith.session.id === signedIn.session.id || ctx.path.startsWith(TWO_FACTOR_VERIFY_PATH_PREFIX))
          if (continuesExistingSignIn) {
            return
          }

          recordAuthLoginAudit(resolveAuthAuditActor(signedIn.user), {
            ip: signedIn.session.ipAddress ?? undefined,
            resourceId: signedIn.user.id,
          })
          await Promise.resolve()
        }),
        matcher: (ctx) => SIGN_IN_PATH_PREFIXES.some((prefix) => ctx.path?.startsWith(prefix) === true),
      },
    ],
  },
  id: "sign-in-audit",
} satisfies BetterAuthPlugin

const recordOwnAccountChange = (
  { body, path }: Readonly<{ body: unknown; path: string }>,
  account: AuditLogActorInput,
  options: AuditEventOptions,
): void => {
  switch (path) {
    case CHANGE_PASSWORD_PATH: {
      recordAuthPasswordChangedAudit(account, options)
      if (passwordChangeSchema.parse(body).revokeOtherSessions === true) {
        recordAuthSessionsRevokedAudit(account, options)
      }

      return
    }
    case DISABLE_TWO_FACTOR_PATH: {
      recordAuthTwoFactorDisabledAudit(account, options)

      return
    }
    default: {
      recordAuthSessionsRevokedAudit(account, options)
    }
  }
}

const recordAdminUserUpdate = (
  account: AuditLogActorInput,
  options: AuditEventOptions,
  { data }: z.infer<typeof adminAccountChangeSchema>,
): void => {
  if (data?.role !== undefined) {
    recordAuthRoleChangedAudit(account, { ...options, detail: data.role })
  }

  if (data?.banned === true) {
    recordAuthUserBannedAudit(account, { ...options, detail: data.banReason })
  }

  if (data?.banned === false) {
    recordAuthUserUnbannedAudit(account, options)
  }

  if (data?.email !== undefined) {
    recordAuthEmailChangedAudit(account, options)
  }
}

const recordAdminAccountChange = ({ account, change, path }: AdminAccountChange, options: AuditEventOptions): void => {
  switch (path) {
    case ADMIN_PATHS.BAN_USER: {
      recordAuthUserBannedAudit(account, { ...options, detail: change.banReason })

      return
    }
    case ADMIN_PATHS.REVOKE_USER_SESSIONS: {
      recordAuthSessionsRevokedAudit(account, options)

      return
    }
    case ADMIN_PATHS.SET_ROLE: {
      recordAuthRoleChangedAudit(account, { ...options, detail: change.role })

      return
    }
    case ADMIN_PATHS.SET_USER_PASSWORD: {
      recordAuthPasswordChangedAudit(account, options)

      return
    }
    case ADMIN_PATHS.UNBAN_USER: {
      recordAuthUserUnbannedAudit(account, options)

      return
    }
    default: {
      recordAdminUserUpdate(account, options, change)
    }
  }
}

export const accountSecurityAudit = {
  hooks: {
    after: [
      {
        handler: createAuthMiddleware(async (ctx) => {
          const caller = ctx.context.session
          if (caller === null || isAPIError(ctx.context.returned)) {
            return
          }

          recordOwnAccountChange(ctx, resolveAuthAuditActor(caller.user), { ip: auditRequestIp(ctx.headers) })
          await Promise.resolve()
        }),
        matcher: (ctx) => ctx.path !== undefined && OWN_ACCOUNT_AUDIT_PATHS.has(ctx.path),
      },
      {
        handler: createAuthMiddleware(async (ctx) => {
          const caller = ctx.context.session
          if (caller === null || isAPIError(ctx.context.returned)) {
            return
          }

          const change = adminAccountChangeSchema.parse(ctx.body)
          const account = await getUserById(change.userId)
          if (account === undefined) {
            return
          }

          recordAdminAccountChange(
            { account: resolveAuthAuditActor(account), change, path: ctx.path },
            { actor: resolveAuthAuditActor(caller.user), ip: auditRequestIp(ctx.headers) },
          )
        }),
        matcher: (ctx) => ctx.path !== undefined && ADMIN_ACCOUNT_AUDIT_PATHS.has(ctx.path),
      },
      {
        handler: createAuthMiddleware(async (ctx) => {
          const enrolling = ctx.context.session
          const enrolled = ctx.context.newSession
          if (enrolling === null || enrolling.user["twoFactorEnabled"] === true || enrolled?.user["twoFactorEnabled"] !== true) {
            return
          }

          recordAuthTwoFactorEnabledAudit(resolveAuthAuditActor(enrolled.user), { ip: auditRequestIp(ctx.headers) })
          await Promise.resolve()
        }),
        matcher: (ctx) => ctx.path === VERIFY_TOTP_PATH,
      },
      {
        handler: createAuthMiddleware(async (ctx) => {
          const changed = ctx.context.newSession
          const token = confirmedEmailChangeSchema.safeParse(await verifyJWT(String(ctx.query?.["token"]), ctx.context.secret))
          if (!token.success || changed?.user.email !== token.data.updateTo) {
            return
          }

          recordAuthEmailChangedAudit(resolveAuthAuditActor(changed.user), {
            detail: `${token.data.email} → ${token.data.updateTo}`,
            ip: auditRequestIp(ctx.headers),
          })
        }),
        matcher: (ctx) => ctx.path === VERIFY_EMAIL_PATH,
      },
    ],
  },
  id: "account-security-audit",
} satisfies BetterAuthPlugin

interface AdminAccountChange {
  readonly account: AuditLogActorInput
  readonly change: z.infer<typeof adminAccountChangeSchema>
  readonly path: string
}
