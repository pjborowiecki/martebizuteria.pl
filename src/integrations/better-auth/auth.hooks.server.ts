import { type User } from "better-auth"
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api"

import { needsTwoFactorSetup } from "~/src/integrations/better-auth/auth.access"
import {
  ADMIN_PLUGIN_PATH_PREFIX,
  ADMIN_TWO_FACTOR_REQUIRED,
  EMAIL_DELIVERY_UNAVAILABLE,
  EMAIL_SENDING_AUTH_PATHS,
  STRIPE_CUSTOMER_NOT_DELETED,
} from "~/src/integrations/better-auth/auth.constants"
import { recordAuthEmailFailure } from "~/src/integrations/better-auth/auth.email-delivery.server"
import { scheduleAdminCustomersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { isEmailSenderUnavailable } from "~/src/integrations/resend/resend.availability.server"

import { sendPasswordChangedEmail } from "~/src/modules/account/use-cases/send-password-changed-email.server"
import {
  recordAuthPasswordResetAudit,
  recordCustomerDeletedAudit,
  recordCustomerRegisteredAudit,
  resolveAuthAuditActor,
} from "~/src/modules/audit-log/audit-log.events.server"
import { SYSTEM_AUDIT_ACTOR } from "~/src/modules/audit-log/audit-log.record.server"
import { linkSubscriberToUser } from "~/src/modules/newsletter/newsletter.accessors"
import { claimGuestOrdersForUser } from "~/src/modules/order/order.claim.server"
import { sendAccountDeletedEmail } from "~/src/modules/user/use-cases/send-account-deleted-email.server"
import { eraseAccountData } from "~/src/modules/user/user.erasure.server"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { auditRequestIp, resolveRequestOrigin } from "~/src/lib/request"

export const guardAuthRequest = createAuthMiddleware(async (ctx) => {
  if (EMAIL_SENDING_AUTH_PATHS.has(ctx.path) && (await isEmailSenderUnavailable())) {
    throw APIError.from("SERVICE_UNAVAILABLE", EMAIL_DELIVERY_UNAVAILABLE)
  }

  if (!ctx.path.startsWith(ADMIN_PLUGIN_PATH_PREFIX)) {
    return
  }

  const caller = await getSessionFromCtx<{ role?: string | null; twoFactorEnabled?: boolean | null }>(ctx)
  if (caller !== null && needsTwoFactorSetup(caller.user)) {
    throw APIError.from("FORBIDDEN", ADMIN_TWO_FACTOR_REQUIRED)
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

export const handleUserUpdated = async (): Promise<void> => {
  scheduleAdminCustomersInvalidation()
  await Promise.resolve()
}

export const handlePasswordReset = async ({ user }: { readonly user: User }, request: Request | undefined): Promise<void> => {
  recordAuthPasswordResetAudit(resolveAuthAuditActor(user), { ip: auditRequestIp(request?.headers) })
  if (request === undefined) {
    recordAuthEmailFailure("password-changed", user.email, "The reset came with no request to link the sign-in page from")

    return
  }

  scheduleBackgroundWork(sendPasswordChangedEmail({ request, user }))
  await Promise.resolve()
}

export const handleEmailVerified = async (user: User): Promise<void> => {
  await Promise.all([claimGuestOrdersForUser({ email: user.email, userId: user.id }), linkSubscriberToUser(user.email, user.id)])
}

export const requireAccountDataErased = async (deleting: User): Promise<void> => {
  if (!(await eraseAccountData(deleting))) {
    throw APIError.from("SERVICE_UNAVAILABLE", STRIPE_CUSTOMER_NOT_DELETED)
  }
}

export const handleSelfServiceDeletion = async (deleted: User, request: Request | undefined): Promise<void> => {
  if (request === undefined) {
    recordAuthEmailFailure("account-deleted", deleted.email, "The deletion came with no request to link the storefront from")

    return
  }

  try {
    await sendAccountDeletedEmail({ email: deleted.email, name: deleted.name, origin: resolveRequestOrigin(request) })
  } catch (error) {
    recordAuthEmailFailure("account-deleted", deleted.email, String(error))
  }
}

interface AuthEndpoint {
  readonly context: {
    readonly session: { readonly user: User } | null
  }
  readonly headers?: Headers | undefined
}
