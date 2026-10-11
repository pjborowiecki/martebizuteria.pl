import { env } from "cloudflare:workers"

import { createElement } from "react"

import { type BetterAuthPlugin, betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { APIError, createAuthMiddleware, getSessionFromCtx, isAPIError } from "better-auth/api"
import { verifyJWT } from "better-auth/crypto"
import { admin, multiSession, twoFactor } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { createTranslator } from "use-intl"
import { v7 as uuidv7 } from "uuid"
import { z } from "zod/v4"

import {
  ADMIN_PANEL_ROLES,
  DEFAULT_ROLE,
  ROLES_CONFIG,
  ac,
  hasAdminAccess,
  needsTwoFactorSetup,
} from "~/src/integrations/better-auth/auth.access"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { type AuthErrorCode } from "~/src/integrations/better-auth/auth.errors"
import {
  TURNSTILE_ACTIONS,
  TURNSTILE_TOKEN_HEADER,
  type TurnstileAction,
} from "~/src/integrations/cloudflare-turnstile/turnstile.constants"
import { passesTurnstile } from "~/src/integrations/cloudflare-turnstile/turnstile.server"
import { turnstileTokenSchema } from "~/src/integrations/cloudflare-turnstile/turnstile.zod"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas"
import { scheduleAdminCustomersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { isEmailSenderUnavailable } from "~/src/integrations/resend/resend.availability.server"
import { PUBLIC_EMAIL_KINDS, admitPublicEmail } from "~/src/integrations/resend/resend.public-email-limits.server"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { appHostsForMode, isLocalMode } from "~/src/modules/_core/constants/api"
import {
  type AuditEventOptions,
  recordAuthEmailChangedAudit,
  recordAuthLoginAudit,
  recordAuthPasswordChangedAudit,
  recordAuthPasswordResetAudit,
  recordAuthRoleChangedAudit,
  recordAuthSessionsRevokedAudit,
  recordAuthTwoFactorDisabledAudit,
  recordAuthTwoFactorEnabledAudit,
  recordAuthUserBannedAudit,
  recordAuthUserUnbannedAudit,
  recordCustomerDeletedAudit,
  recordCustomerRegisteredAudit,
  recordEmailFailedAudit,
  resolveAuthAuditActor,
} from "~/src/modules/audit-log/audit-log.events.server"
import { type AuditLogActorInput, SYSTEM_AUDIT_ACTOR } from "~/src/modules/audit-log/audit-log.record.server"
import { linkSubscriberToUser } from "~/src/modules/newsletter/newsletter.accessors"
import { claimGuestOrdersForUser } from "~/src/modules/order/order.claim.server"
import { getUserById } from "~/src/modules/user/user.accessors"
import { USER_ERROR_CODES } from "~/src/modules/user/user.constants"
import { eraseAccountData } from "~/src/modules/user/user.erasure.server"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { IP_ADDRESS_HEADER, authRateLimitStorage } from "~/src/lib/rate-limit"
import { resolveRequestIp, resolveRequestOrigin } from "~/src/lib/request"
import { buildLocalizedUrl } from "~/src/lib/seo"

import { APP_NAME } from "~/src/presentation/branding/app"

import type accountDeletedMessages from "~/messages/en-US/emails.account-deleted.json"
import type changeEmailMessages from "~/messages/en-US/emails.change-email.json"
import type passwordChangedMessages from "~/messages/en-US/emails.password-changed.json"
import type resetPasswordMessages from "~/messages/en-US/emails.reset-password.json"
import type verifyEmailMessages from "~/messages/en-US/emails.verify-email.json"
import { ACCOUNT_DELETED_NAMESPACE, AccountDeleted } from "~/src/presentation/emails/account-deleted"
import { CHANGE_EMAIL_NAMESPACE, ChangeEmail } from "~/src/presentation/emails/change-email"
import { PASSWORD_CHANGED_NAMESPACE, PasswordChanged } from "~/src/presentation/emails/password-changed"
import { RESET_PASSWORD_NAMESPACE, ResetPassword } from "~/src/presentation/emails/reset-password"
import { VERIFY_EMAIL_NAMESPACE, VerifyEmail } from "~/src/presentation/emails/verify-email"
import { ROUTES } from "~/src/routes"

const MAX_FORGET_PASSWORD_ATTEMPTS = 3

const MAX_LOGIN_ATTEMPTS = 5

const MAX_RESET_PASSWORD_ATTEMPTS = 5

const MAX_SIGNUP_ATTEMPTS = 3

const MAX_CONCURRENT_SESSIONS = 5

const RATE_LIMIT_MAX_REQUESTS = 100

const RATE_LIMIT_WINDOW_IN_SECONDS = 60

const SESSION_UPDATE_AGE_IN_SECONDS = 300

const EMAIL_SENDING_AUTH_PATHS: ReadonlySet<string> = new Set([
  ROUTES.API_AUTH.CHANGE_EMAIL,
  ROUTES.API_AUTH.REQUEST_PASSWORD_RESET,
  ROUTES.API_AUTH.SEND_VERIFICATION_EMAIL,
  ROUTES.API_AUTH.SIGN_UP_EMAIL,
])

const BOT_CHECKED_AUTH_PATHS: ReadonlyMap<string, TurnstileAction> = new Map([
  [ROUTES.API_AUTH.REQUEST_PASSWORD_RESET, TURNSTILE_ACTIONS.PASSWORD_RESET],
  [ROUTES.API_AUTH.SEND_VERIFICATION_EMAIL, TURNSTILE_ACTIONS.VERIFICATION_RESEND],
  [ROUTES.API_AUTH.SIGN_UP_EMAIL, TURNSTILE_ACTIONS.SIGN_UP],
])

const BOT_CHECK_FAILED = {
  code: "BOT_CHECK_FAILED",
  message: "The bot check did not pass",
} as const satisfies AuthRefusal

const EMAIL_DELIVERY_FAILED = {
  code: "EMAIL_DELIVERY_FAILED",
  message: "The email could not be sent",
} as const satisfies AuthRefusal

const EMAIL_DELIVERY_UNAVAILABLE = {
  code: "EMAIL_DELIVERY_UNAVAILABLE",
  message: "Emails cannot be sent at the moment",
} as const satisfies AuthRefusal

const STRIPE_CUSTOMER_NOT_DELETED = {
  code: USER_ERROR_CODES.STRIPE_CUSTOMER_NOT_DELETED,
  message: "The saved cards could not be deleted at Stripe, so the account was kept",
} as const

const ADMIN_PASSWORD_SIGN_IN_REQUIRED = {
  code: "ADMIN_PASSWORD_SIGN_IN_REQUIRED",
  message: "Admin accounts sign in with their password and a two-factor authentication code",
} as const satisfies AuthRefusal

const ADMIN_TWO_FACTOR_REQUIRED = {
  code: "ADMIN_TWO_FACTOR_REQUIRED",
  message: "Turn on two-factor authentication before using the admin panel",
} as const satisfies AuthRefusal

const PROVIDER_SIGN_IN_PATH_PREFIXES = ["/callback/", "/sign-in/social"]

const ADMIN_PLUGIN_PATH_PREFIX = "/admin/"

const TWO_FACTOR_VERIFY_PATH_PREFIX = "/two-factor/verify-"

const SIGN_IN_PATH_PREFIXES = ["/sign-in/", "/sign-up/", "/callback/", "/verify-email", TWO_FACTOR_VERIFY_PATH_PREFIX]

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

const CHANGE_PASSWORD_PATH = "/change-password"

const DISABLE_TWO_FACTOR_PATH = "/two-factor/disable"

const OWN_ACCOUNT_AUDIT_PATHS: ReadonlySet<string> = new Set([
  CHANGE_PASSWORD_PATH,
  DISABLE_TWO_FACTOR_PATH,
  "/revoke-other-sessions",
  "/revoke-session",
  "/revoke-sessions",
])

const ADMIN_PATHS = {
  BAN_USER: "/admin/ban-user",
  REVOKE_USER_SESSIONS: "/admin/revoke-user-sessions",
  SET_ROLE: "/admin/set-role",
  SET_USER_PASSWORD: "/admin/set-user-password",
  UNBAN_USER: "/admin/unban-user",
  UPDATE_USER: "/admin/update-user",
} as const

const ADMIN_ACCOUNT_AUDIT_PATHS: ReadonlySet<string> = new Set(Object.values(ADMIN_PATHS))

const VERIFY_TOTP_PATH = "/two-factor/verify-totp"

const VERIFY_EMAIL_PATH = "/verify-email"

const roleChange = z.union([z.string(), z.array(z.string())]).transform((role) => [role].flat().join(", "))

const passwordChange = z.object({ revokeOtherSessions: z.boolean().optional() })

const adminAccountChange = z.object({
  banReason: z.string().optional(),
  data: z
    .object({ banReason: z.string().optional(), banned: z.boolean().optional(), email: z.string().optional(), role: roleChange.optional() })
    .optional(),
  role: roleChange.optional(),
  userId: z.string(),
})

const confirmedEmailChange = z.object({ email: z.string(), requestType: z.literal("change-email-verification"), updateTo: z.string() })

const auditRequestIp = (headers: Headers | undefined): string | undefined => (headers === undefined ? undefined : resolveRequestIp(headers))

const recordOwnAccountChange = (
  { body, path }: Readonly<{ body: unknown; path: string }>,
  account: AuditLogActorInput,
  options: AuditEventOptions,
): void => {
  switch (path) {
    case CHANGE_PASSWORD_PATH: {
      recordAuthPasswordChangedAudit(account, options)
      if (passwordChange.parse(body).revokeOtherSessions === true) {
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
  { data }: z.infer<typeof adminAccountChange>,
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

          const change = adminAccountChange.parse(ctx.body)
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
          const token = confirmedEmailChange.safeParse(await verifyJWT(String(ctx.query?.["token"]), ctx.context.secret))
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

const resolveEmailVerificationCallbackUrl = (url: string, locale: SupportedLocale): string => {
  try {
    const parsed = new URL(url)
    const callbackParam = parsed.searchParams.get("callbackURL")
    if (callbackParam === null) {
      return url
    }

    const callback = decodeURIComponent(callbackParam)
    const storefrontHome = buildLocalizedUrl("", "/", locale)
    const redirectsToStorefront = callback === "/" || callback === storefrontHome || callback.startsWith(`${storefrontHome}?`)
    if (!redirectsToStorefront) {
      return url
    }

    const accountCallback = buildLocalizedUrl("", `${ROUTES.ACCOUNT_OVERVIEW}?verified=true`, locale)
    parsed.searchParams.set("callbackURL", accountCallback)

    return parsed.toString()
  } catch {
    return url
  }
}

const recordAuthEmailFailure = (kind: string, recipient: string, failure: string): void => {
  console.error(`[Auth] Failed to send ${kind} email to ${recipient}: ${failure}`)
  recordEmailFailedAudit(recipient, { detail: `Auth ${kind} email — ${failure}` })
}

const deliverAuthEmail = async (kind: string, email: Parameters<typeof sendEmail>[0]): Promise<boolean> => {
  const failure = await sendEmail(email)
  if (failure === undefined) {
    return true
  }

  recordAuthEmailFailure(kind, email.to, failure)

  return false
}

const requireAuthEmailDelivery = async (kind: string, email: Parameters<typeof sendEmail>[0]): Promise<void> => {
  if (!(await deliverAuthEmail(kind, { ...email, revealsAccountExistence: true }))) {
    throw APIError.from("SERVICE_UNAVAILABLE", EMAIL_DELIVERY_FAILED)
  }
}

const passesBotCheck = (request: Request | undefined, action: TurnstileAction): Promise<boolean> => {
  const token = turnstileTokenSchema.safeParse(request?.headers.get(TURNSTILE_TOKEN_HEADER))
  if (request === undefined || !token.success) {
    return Promise.resolve(false)
  }

  return passesTurnstile({
    action,
    hostname: new URL(request.url).hostname,
    remoteIp: resolveRequestIp(request.headers),
    token: token.data,
  })
}

export const sendVerificationEmail = async ({ user, url }: AuthEmailParams): Promise<void> => {
  if (!(await admitPublicEmail({ kind: PUBLIC_EMAIL_KINDS.VERIFICATION, to: user.email }))) {
    return
  }

  const locale = getCurrentLocale()
  const verificationUrl = resolveEmailVerificationCallbackUrl(url, locale)
  const messages = await loadNamespace<typeof verifyEmailMessages>({ locale, namespace: VERIFY_EMAIL_NAMESPACE })
  await requireAuthEmailDelivery("verification", {
    react: createElement(VerifyEmail, {
      locale,
      messages,
      name: user.name,
      verificationUrl,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}

export const sendResetPassword = async ({ user, url }: AuthEmailParams): Promise<void> => {
  if (!(await admitPublicEmail({ kind: PUBLIC_EMAIL_KINDS.PASSWORD_RESET, to: user.email }))) {
    return
  }

  const locale = getCurrentLocale()
  const messages = await loadNamespace<typeof resetPasswordMessages>({ locale, namespace: RESET_PASSWORD_NAMESPACE })
  await requireAuthEmailDelivery("reset-password", {
    react: createElement(ResetPassword, {
      locale,
      messages,
      name: user.name,
      resetPasswordUrl: url,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}

export const sendChangeEmailConfirmation = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale()
  const messages = await loadNamespace<typeof changeEmailMessages>({ locale, namespace: CHANGE_EMAIL_NAMESPACE })
  await requireAuthEmailDelivery("change-email confirmation", {
    react: createElement(ChangeEmail, {
      locale,
      messages,
      name: user.name,
      verificationUrl: url,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
}

export const sendPasswordChangedEmail = async ({ request, user }: PasswordChangedEmailParams): Promise<void> => {
  try {
    const locale = getCurrentLocale()
    const signInUrl = buildLocalizedUrl(resolveRequestOrigin(request), ROUTES.AUTH_SIGN_IN, locale)
    const messages = await loadNamespace<typeof passwordChangedMessages>({ locale, namespace: PASSWORD_CHANGED_NAMESPACE })

    await deliverAuthEmail("password-changed", {
      react: createElement(PasswordChanged, {
        locale,
        messages,
        name: user.name,
        signInUrl,
      }),
      subject: createTranslator({ locale, messages })("subject"),
      to: user.email,
    })
  } catch (error) {
    recordAuthEmailFailure("password-changed", user.email, String(error))
  }
}

export const sendAccountDeletedEmail = async ({ email, locale, name, origin }: AccountDeletedEmailParams): Promise<boolean> => {
  try {
    const resolvedLocale = locale ?? getCurrentLocale()
    const storefrontUrl = buildLocalizedUrl(origin, ROUTES.HOME, resolvedLocale)
    const messages = await loadNamespace<typeof accountDeletedMessages>({ locale: resolvedLocale, namespace: ACCOUNT_DELETED_NAMESPACE })

    return await deliverAuthEmail("account-deleted", {
      react: createElement(AccountDeleted, {
        locale: resolvedLocale,
        messages,
        name,
        storefrontUrl,
      }),
      subject: createTranslator({ locale: resolvedLocale, messages })("subject"),
      to: email,
    })
  } catch (error) {
    recordAuthEmailFailure("account-deleted", email, String(error))

    return false
  }
}

export const auth = betterAuth({
  account: {
    accountLinking: { enabled: true },
    encryptOAuthTokens: true,
  },
  advanced: {
    backgroundTasks: { handler: scheduleBackgroundWork },
    database: { generateId: () => uuidv7(), joins: true },
    ipAddress: {
      ipAddressHeaders: [IP_ADDRESS_HEADER],
    },
    useSecureCookies: !isLocalMode(import.meta.env.MODE),
  },
  appName: APP_NAME,
  baseURL: { allowedHosts: appHostsForMode(import.meta.env.MODE) },
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  databaseHooks: {
    session: {
      create: {
        before: async (session, endpoint) => {
          if (endpoint === null || !PROVIDER_SIGN_IN_PATH_PREFIXES.some((prefix) => endpoint.path.startsWith(prefix))) {
            return
          }

          const signingIn = await getUserById(session.userId)
          if (hasAdminAccess(signingIn?.role)) {
            throw APIError.from("FORBIDDEN", ADMIN_PASSWORD_SIGN_IN_REQUIRED)
          }
        },
      },
    },
    user: {
      create: {
        after: async (user) => {
          scheduleAdminCustomersInvalidation()
          recordCustomerRegisteredAudit(user.email, { detail: user.name, resourceId: user.id })

          if (user.emailVerified) {
            await Promise.all([claimGuestOrdersForUser({ email: user.email, userId: user.id }), linkSubscriberToUser(user.email, user.id)])
          }
        },
      },
      delete: {
        after: async (deleted, endpoint) => {
          scheduleAdminCustomersInvalidation()
          const caller = endpoint?.context.session
          recordCustomerDeletedAudit(resolveAuthAuditActor(deleted), {
            actor: caller === undefined || caller === null ? SYSTEM_AUDIT_ACTOR : resolveAuthAuditActor(caller.user),
            ip: auditRequestIp(endpoint?.headers),
          })
          await Promise.resolve()
        },
      },
      update: {
        after: async () => {
          scheduleAdminCustomersInvalidation()
          await Promise.resolve()
        },
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    onPasswordReset: async ({ user }, request) => {
      recordAuthPasswordResetAudit(resolveAuthAuditActor(user), { ip: auditRequestIp(request?.headers) })
      if (request === undefined) {
        recordAuthEmailFailure("password-changed", user.email, "The reset came with no request to link the sign-in page from")

        return
      }

      scheduleBackgroundWork(sendPasswordChangedEmail({ request, user }))
      await Promise.resolve()
    },
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword,
  },
  emailVerification: {
    afterEmailVerification: async (user) => {
      await Promise.all([claimGuestOrdersForUser({ email: user.email, userId: user.id }), linkSubscriberToUser(user.email, user.id)])
    },
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (EMAIL_SENDING_AUTH_PATHS.has(ctx.path) && (await isEmailSenderUnavailable())) {
        throw APIError.from("SERVICE_UNAVAILABLE", EMAIL_DELIVERY_UNAVAILABLE)
      }

      const botCheckAction = BOT_CHECKED_AUTH_PATHS.get(ctx.path)
      if (botCheckAction !== undefined && !(await passesBotCheck(ctx.request, botCheckAction))) {
        throw APIError.from("FORBIDDEN", BOT_CHECK_FAILED)
      }

      if (!ctx.path.startsWith(ADMIN_PLUGIN_PATH_PREFIX)) {
        return
      }

      const caller = await getSessionFromCtx<{ role?: string | null; twoFactorEnabled?: boolean | null }>(ctx)
      if (caller !== null && needsTwoFactorSetup(caller.user)) {
        throw APIError.from("FORBIDDEN", ADMIN_TWO_FACTOR_REQUIRED)
      }
    }),
  },
  plugins: [
    admin({
      ac,
      adminRoles: [...ADMIN_PANEL_ROLES],
      defaultRole: DEFAULT_ROLE,
      roles: ROLES_CONFIG,
    }),
    multiSession({
      maximumSessions: MAX_CONCURRENT_SESSIONS,
    }),
    twoFactor({
      issuer: APP_NAME,
    }),
    signInAudit,
    accountSecurityAudit,
    tanstackStartCookies(),
  ],
  rateLimit: {
    customRules: {
      [ROUTES.API_AUTH.REQUEST_PASSWORD_RESET]: {
        max: MAX_FORGET_PASSWORD_ATTEMPTS,
        window: RATE_LIMIT_WINDOW_IN_SECONDS,
      },
      [ROUTES.API_AUTH.RESET_PASSWORD]: {
        max: MAX_RESET_PASSWORD_ATTEMPTS,
        window: RATE_LIMIT_WINDOW_IN_SECONDS,
      },
      [ROUTES.API_AUTH.SIGN_IN_EMAIL]: {
        max: MAX_LOGIN_ATTEMPTS,
        window: RATE_LIMIT_WINDOW_IN_SECONDS,
      },
      [ROUTES.API_AUTH.SIGN_UP_EMAIL]: {
        max: MAX_SIGNUP_ATTEMPTS,
        window: RATE_LIMIT_WINDOW_IN_SECONDS,
      },
    },
    customStorage: authRateLimitStorage,
    enabled: true,
    max: RATE_LIMIT_MAX_REQUESTS,
    window: RATE_LIMIT_WINDOW_IN_SECONDS,
  },
  secret: env.AUTH_SECRET,
  session: {
    cookieCache: { enabled: false },
    storeSessionInDatabase: true,
    updateAge: SESSION_UPDATE_AGE_IN_SECONDS,
  },
  socialProviders: {
    google: { clientId: env.AUTH_GOOGLE_CLIENT_ID, clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET },
  },
  telemetry: { enabled: false },
  user: {
    additionalFields: {
      timezone: {
        input: true,
        required: false,
        type: "string",
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation,
    },
    deleteUser: {
      afterDelete: async (deleted, request) => {
        if (request === undefined) {
          recordAuthEmailFailure("account-deleted", deleted.email, "The deletion came with no request to link the storefront from")

          return
        }

        try {
          await sendAccountDeletedEmail({ email: deleted.email, name: deleted.name, origin: resolveRequestOrigin(request) })
        } catch (error) {
          recordAuthEmailFailure("account-deleted", deleted.email, String(error))
        }
      },
      beforeDelete: async (deleting) => {
        if (!(await eraseAccountData(deleting))) {
          throw APIError.from("SERVICE_UNAVAILABLE", STRIPE_CUSTOMER_NOT_DELETED)
        }
      },
      enabled: true,
    },
  },
  verification: { storeIdentifier: "hashed", storeInDatabase: true },
})

interface AdminAccountChange {
  readonly account: AuditLogActorInput
  readonly change: z.infer<typeof adminAccountChange>
  readonly path: string
}

interface AuthEmailParams {
  readonly url: string
  readonly user: {
    readonly email: string
    readonly name: string
  }
}

interface AuthRefusal {
  readonly code: AuthErrorCode
  readonly message: string
}

interface PasswordChangedEmailParams {
  readonly request: Request
  readonly user: AuthEmailParams["user"]
}

interface AccountDeletedEmailParams {
  readonly email: string
  readonly locale?: SupportedLocale
  readonly name: string
  readonly origin: string
}
