import { env } from "cloudflare:workers"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, anonymous, multiSession, twoFactor } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { eq } from "drizzle-orm"
import { v7 as uuidv7 } from "uuid"

import { authActions } from "~/src/integrations/better-auth/auth.actions"
import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.background"
import { ADMIN_PANEL_ROLES, DEFAULT_ROLE } from "~/src/integrations/better-auth/auth.constants"
import { ROLES_CONFIG, ac } from "~/src/integrations/better-auth/auth.permissions"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas"

import { recordAuthLoginAudit, recordCustomerRegisteredAudit, resolveAuthAuditActor } from "~/src/modules/audit-log/audit-log.events.server"
import { user as userTable } from "~/src/modules/user/user.schema"

import { scheduleAdminCustomersInvalidation } from "~/src/lib/realtime-invalidation/realtime-invalidation.catalog.server"

import { APP_NAME } from "~/src/presentation/branding/app"

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
const TRUSTED_IP_HEADERS = ["cf-connecting-ip"]

export const auth = betterAuth({
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: TRUSTED_AUTH_PROVIDERS,
    },
  },
  advanced: {
    backgroundTasks: { handler: scheduleBackgroundWork },
    database: { generateId: () => uuidv7(), joins: true },
    ipAddress: {
      ipAddressHeaders: TRUSTED_IP_HEADERS,
    },
  },
  appName: APP_NAME,
  baseURL: env.VITE_APP_URL,
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
          await Promise.resolve()
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
    requireEmailVerification: true,
    sendResetPassword: authActions.sendResetPassword,
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: authActions.sendVerificationEmail,
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
  trustedOrigins: [env.VITE_APP_URL],
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
      sendChangeEmailConfirmation: authActions.sendChangeEmailConfirmation,
    },
  },
  verification: { storeInDatabase: true },
})
