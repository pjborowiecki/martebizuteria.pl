import { env } from "cloudflare:workers"

import { createElement } from "react"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, anonymous, multiSession, twoFactor } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { eq } from "drizzle-orm"
import { createTranslator } from "use-intl"
import { v7 as uuidv7 } from "uuid"

import { ADMIN_PANEL_ROLES, DEFAULT_ROLE, ROLES_CONFIG, ac } from "~/src/integrations/better-auth/auth.access"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas"
import { scheduleAdminCustomersInvalidation } from "~/src/integrations/realtime-invalidation/realtime-invalidation.catalog.server"
import { sendEmail } from "~/src/integrations/resend/resend.send"
import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { appHostsForMode, isLocalMode } from "~/src/modules/_core/constants/api"
import { recordAuthLoginAudit, recordCustomerRegisteredAudit, resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.events.server"
import { linkSubscriberToUser } from "~/src/modules/newsletter/newsletter.accessors"
import { claimGuestOrdersForUser } from "~/src/modules/order/order.claim.server"
import { user as userTable } from "~/src/modules/user/user.schema"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { IP_ADDRESS_HEADER } from "~/src/lib/rate-limit"
import { buildLocalizedUrl } from "~/src/lib/seo"

import { APP_NAME, APP_URL } from "~/src/presentation/branding/app"

import type accountDeletedMessages from "~/messages/en-US/emails.account-deleted.json"
import type changeEmailMessages from "~/messages/en-US/emails.change-email.json"
import type resetPasswordMessages from "~/messages/en-US/emails.reset-password.json"
import type verifyEmailMessages from "~/messages/en-US/emails.verify-email.json"
import { ACCOUNT_DELETED_NAMESPACE, AccountDeleted } from "~/src/presentation/emails/account-deleted"
import { CHANGE_EMAIL_NAMESPACE, ChangeEmail } from "~/src/presentation/emails/change-email"
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

const COOKIE_CACHE_MAX_AGE_IN_SECONDS = 300

const TRUSTED_AUTH_PROVIDERS = ["google", "github"]

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

const reportEmailFailure = (kind: string, recipient: string, failure: string | undefined): void => {
  if (failure !== undefined) {
    console.error(`[Auth] Failed to send ${kind} email to ${recipient}: ${failure}`)
  }
}

export const sendVerificationEmail = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale()
  const verificationUrl = resolveEmailVerificationCallbackUrl(url, locale)
  const messages = await loadNamespace<typeof verifyEmailMessages>({ locale, namespace: VERIFY_EMAIL_NAMESPACE })
  const failure = await sendEmail({
    react: createElement(VerifyEmail, {
      locale,
      messages,
      name: user.name,
      verificationUrl,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
  reportEmailFailure("verification", user.email, failure)
}

export const sendResetPassword = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale()
  const messages = await loadNamespace<typeof resetPasswordMessages>({ locale, namespace: RESET_PASSWORD_NAMESPACE })
  const failure = await sendEmail({
    react: createElement(ResetPassword, {
      locale,
      messages,
      name: user.name,
      resetPasswordUrl: url,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
  reportEmailFailure("reset-password", user.email, failure)
}

export const sendChangeEmailConfirmation = async ({ user, url }: AuthEmailParams): Promise<void> => {
  const locale = getCurrentLocale()
  const messages = await loadNamespace<typeof changeEmailMessages>({ locale, namespace: CHANGE_EMAIL_NAMESPACE })
  const failure = await sendEmail({
    react: createElement(ChangeEmail, {
      locale,
      messages,
      name: user.name,
      verificationUrl: url,
    }),
    subject: createTranslator({ locale, messages })("subject"),
    to: user.email,
  })
  reportEmailFailure("change-email confirmation", user.email, failure)
}

export const sendAccountDeletedEmail = async ({ email, locale, name }: AccountDeletedEmailParams): Promise<void> => {
  const resolvedLocale = locale ?? getCurrentLocale()
  const storefrontUrl = `${APP_URL}/${resolvedLocale}`
  const messages = await loadNamespace<typeof accountDeletedMessages>({ locale: resolvedLocale, namespace: ACCOUNT_DELETED_NAMESPACE })
  const failure = await sendEmail({
    react: createElement(AccountDeleted, {
      locale: resolvedLocale,
      messages,
      name,
      storefrontUrl,
    }),
    subject: createTranslator({ locale: resolvedLocale, messages })("subject"),
    to: email,
  })
  reportEmailFailure("account-deleted", email, failure)
}

export const auth = betterAuth({
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: TRUSTED_AUTH_PROVIDERS,
    },
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
        after: async (createdSession) => {
          const sessionUser = await db.query.user.findFirst({
            where: eq(userTable.id, createdSession.userId),
          })

          if (sessionUser === undefined) {
            return
          }

          recordAuthLoginAudit(resolveAuthAuditActor(sessionUser), {
            ip: createdSession.ipAddress ?? undefined,
            resourceId: sessionUser.id,
          })
          await Promise.resolve()
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
        after: async () => {
          scheduleAdminCustomersInvalidation()
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
    requireEmailVerification: true,
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
  plugins: [
    admin({
      ac,
      adminRoles: [...ADMIN_PANEL_ROLES],
      defaultRole: DEFAULT_ROLE,
      roles: ROLES_CONFIG,
    }),
    anonymous(),
    multiSession({
      maximumSessions: MAX_CONCURRENT_SESSIONS,
    }),
    twoFactor({
      issuer: APP_NAME,
    }),
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
    enabled: true,
    max: RATE_LIMIT_MAX_REQUESTS,
    storage: "database",
    window: RATE_LIMIT_WINDOW_IN_SECONDS,
  },
  secret: env.AUTH_SECRET,
  session: {
    cookieCache: { enabled: true, maxAge: COOKIE_CACHE_MAX_AGE_IN_SECONDS, version: "2" },
    storeSessionInDatabase: true,
  },
  socialProviders: {
    github: { clientId: env.AUTH_GITHUB_CLIENT_ID, clientSecret: env.AUTH_GITHUB_CLIENT_SECRET },
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
      afterDelete: async (deleted) => {
        await sendAccountDeletedEmail({ email: deleted.email, name: deleted.name })
      },
      enabled: true,
    },
  },
  verification: { storeIdentifier: "hashed", storeInDatabase: true },
})

interface AuthEmailParams {
  readonly url: string
  readonly user: {
    readonly email: string
    readonly name: string
  }
}

interface AccountDeletedEmailParams {
  readonly email: string
  readonly locale?: SupportedLocale
  readonly name: string
}
