import { type User } from "better-auth"
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api"

import { hasAdminAccess, needsTwoFactorSetup } from "~/src/integrations/better-auth/auth.access"
import {
  ADMIN_ACCOUNT_NOT_DELETABLE,
  ADMIN_PATHS,
  ADMIN_PLUGIN_PATH_PREFIX,
  ADMIN_TWO_FACTOR_REQUIRED,
  EMAIL_CHANGED_BY_ITS_OWNER,
  EMAIL_DELIVERY_UNAVAILABLE,
  EMAIL_SENDING_AUTH_PATHS,
  REMOVE_USER_PATH,
  ROLE_FIELD_ADMIN_PATHS,
  ROLE_MANAGED_IN_TEAM_SETTINGS,
  SET_ROLE_PATH,
  STRIPE_CUSTOMER_NOT_DELETED,
  VERIFY_EMAIL_PATH,
} from "~/src/integrations/better-auth/auth.constants"
import { confirmEmailChangeOwner } from "~/src/integrations/better-auth/auth.email-change.server"
import { recordAuthEmailFailure } from "~/src/integrations/better-auth/auth.email-delivery.server"
import { refuseSupersededEmailLink } from "~/src/integrations/better-auth/auth.email-link.server"
import { adminAddressFieldsSchema, adminRoleFieldsSchema, adminTargetAccountSchema } from "~/src/integrations/better-auth/auth.zod"
import { scheduleAdminCustomersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { isEmailSenderUnavailable } from "~/src/integrations/resend/resend.availability.server"

import { sendPasswordChangedEmail } from "~/src/modules/account/use-cases/send-password-changed-email.server"
import {
  recordAuthEmailVerifiedAudit,
  recordAuthPasswordResetAudit,
  recordCustomerDeletedAudit,
  recordCustomerRegisteredAudit,
  resolveAuthAuditActor,
} from "~/src/modules/audit-log/audit-log.events.server"
import { SYSTEM_AUDIT_ACTOR } from "~/src/modules/audit-log/audit-log.record.server"
import { linkSubscriberToUser } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.accessors"
import { claimGuestOrdersForUser } from "~/src/modules/order/order.claim.server"
import { sendAccountDeletedEmail } from "~/src/modules/user/use-cases/send-account-deleted-email.server"
import { getUserById } from "~/src/modules/user/user.accessors"
import { eraseAccountData } from "~/src/modules/user/user.erasure.server"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { auditRequestIp, resolveRequestOrigin } from "~/src/lib/request"

import { ROUTES } from "~/src/routes"

const requestsRoleChange = ({ body, path }: Readonly<{ body: unknown; path: string }>): boolean =>
  path === SET_ROLE_PATH || (ROLE_FIELD_ADMIN_PATHS.has(path) && adminRoleFieldsSchema.safeParse(body).data === true)

const removesAdminAccount = async ({ body, path }: Readonly<{ body: unknown; path: string }>): Promise<boolean> => {
  const target = path === REMOVE_USER_PATH ? adminTargetAccountSchema.safeParse(body).data : undefined
  const account = target === undefined ? undefined : await getUserById(target.userId)

  return hasAdminAccess(account?.role)
}

const requestsAddressChange = ({ body, path }: Readonly<{ body: unknown; path: string }>): boolean =>
  path === ADMIN_PATHS.UPDATE_USER && adminAddressFieldsSchema.safeParse(body).data === true

export const guardAuthRequest = createAuthMiddleware(async (ctx) => {
  if (EMAIL_SENDING_AUTH_PATHS.has(ctx.path) && (await isEmailSenderUnavailable())) {
    throw APIError.from("SERVICE_UNAVAILABLE", EMAIL_DELIVERY_UNAVAILABLE)
  }

  if (ctx.path === VERIFY_EMAIL_PATH) {
    await refuseSupersededEmailLink(ctx)

    return
  }

  if (ctx.path === ROUTES.API_AUTH.CHANGE_EMAIL) {
    await confirmEmailChangeOwner(ctx)

    return
  }

  if (!ctx.path.startsWith(ADMIN_PLUGIN_PATH_PREFIX)) {
    return
  }

  if (requestsRoleChange(ctx)) {
    throw APIError.from("FORBIDDEN", ROLE_MANAGED_IN_TEAM_SETTINGS)
  }

  if (requestsAddressChange(ctx)) {
    throw APIError.from("FORBIDDEN", EMAIL_CHANGED_BY_ITS_OWNER)
  }

  const caller = await getSessionFromCtx<{ role?: string | null; twoFactorEnabled?: boolean | null }>(ctx)
  if (caller !== null && needsTwoFactorSetup(caller.user)) {
    throw APIError.from("FORBIDDEN", ADMIN_TWO_FACTOR_REQUIRED)
  }

  if (hasAdminAccess(caller?.user.role) && (await removesAdminAccount(ctx))) {
    throw APIError.from("FORBIDDEN", ADMIN_ACCOUNT_NOT_DELETABLE)
  }
})

export const handleUserCreated = async (user: User): Promise<void> => {
  scheduleAdminCustomersInvalidation()
  recordCustomerRegisteredAudit(user.email, { detail: user.name, resourceId: user.id })

  if (user.emailVerified) {
    await Promise.all([claimGuestOrdersForUser({ email: user.email, userId: user.id }), linkSubscriberToUser(user.email, user.id)])
  }
}

export const handleUserDeleted = async (deleted: User, endpoint: AuthEndpoint | null): Promise<void> => {
  scheduleAdminCustomersInvalidation()
  const caller = endpoint?.context.session
  recordCustomerDeletedAudit(resolveAuthAuditActor(deleted), {
    actor: caller === undefined || caller === null ? SYSTEM_AUDIT_ACTOR : resolveAuthAuditActor(caller.user),
    ip: auditRequestIp(endpoint?.headers),
  })
  await Promise.resolve()
}

export const handleUserUpdated = async (updated: User): Promise<void> => {
  scheduleAdminCustomersInvalidation()
  if (updated.emailVerified) {
    await claimGuestOrdersForUser({ email: updated.email, userId: updated.id })
  }
}

export const handlePasswordReset = async ({ user }: { readonly user: User }, request: Request | undefined): Promise<void> => {
  recordAuthPasswordResetAudit(resolveAuthAuditActor(user), { ip: auditRequestIp(request?.headers) })
  if (request === undefined) {
    recordAuthEmailFailure("password-changed", {
      failure: "The reset came with no request to link the sign-in page from",
      to: user.email,
      userId: user.id,
    })

    return
  }

  scheduleBackgroundWork(sendPasswordChangedEmail({ request, user }))
  await Promise.resolve()
}

export const handleEmailVerified = async (user: User, request: Request | undefined): Promise<void> => {
  recordAuthEmailVerifiedAudit(resolveAuthAuditActor(user), { ip: auditRequestIp(request?.headers) })
  await Promise.all([claimGuestOrdersForUser({ email: user.email, userId: user.id }), linkSubscriberToUser(user.email, user.id)])
}

export const prepareSelfServiceDeletion = async (deleting: User & { readonly role?: string | null }): Promise<void> => {
  if (hasAdminAccess(deleting.role)) {
    throw APIError.from("FORBIDDEN", ADMIN_ACCOUNT_NOT_DELETABLE)
  }

  if (!(await eraseAccountData(deleting))) {
    throw APIError.from("SERVICE_UNAVAILABLE", STRIPE_CUSTOMER_NOT_DELETED)
  }
}

export const handleSelfServiceDeletion = async (deleted: User, request: Request | undefined): Promise<void> => {
  if (request === undefined) {
    recordAuthEmailFailure("account-deleted", {
      failure: "The deletion came with no request to link the storefront from",
      to: deleted.email,
    })

    return
  }

  try {
    await sendAccountDeletedEmail({ email: deleted.email, name: deleted.name, origin: resolveRequestOrigin(request) })
  } catch (error) {
    recordAuthEmailFailure("account-deleted", { failure: String(error), to: deleted.email })
  }
}

interface AuthEndpoint {
  readonly context: {
    readonly session: { readonly user: User } | null
  }
  readonly headers?: Headers | undefined
}
