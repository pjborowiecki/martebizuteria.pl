import { env } from "cloudflare:workers"

import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin, multiSession, twoFactor } from "better-auth/plugins"
import { tanstackStartCookies } from "better-auth/tanstack-start"
import { v7 as uuidv7 } from "uuid"

import { ADMIN_PANEL_ROLES, DEFAULT_ROLE, ROLES_CONFIG, ac } from "~/src/integrations/better-auth/auth.access"
import { accountSecurityAudit, signInAudit } from "~/src/integrations/better-auth/auth.audit.server"
import {
  MAX_CONCURRENT_SESSIONS,
  RATE_LIMIT_CUSTOM_RULES,
  RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_IN_SECONDS,
  SESSION_FRESH_AGE_IN_SECONDS,
  SESSION_UPDATE_AGE_IN_SECONDS,
} from "~/src/integrations/better-auth/auth.constants"
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { finishEmailChange } from "~/src/integrations/better-auth/auth.email-change.server"
import {
  guardAuthRequest,
  handleEmailVerified,
  handlePasswordReset,
  handleSelfServiceDeletion,
  handleUserCreated,
  handleUserDeleted,
  handleUserUpdated,
  prepareSelfServiceDeletion,
} from "~/src/integrations/better-auth/auth.hooks.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas"

import { appHostsForMode, isLocalMode } from "~/src/modules/_core/constants/api"
import { sendChangeEmailConfirmationEmail } from "~/src/modules/account/use-cases/send-change-email-confirmation-email.server"
import { sendResetPasswordEmail } from "~/src/modules/verification/use-cases/send-reset-password-email.server"
import { sendVerifyEmail } from "~/src/modules/verification/use-cases/send-verify-email.server"

import { scheduleBackgroundWork } from "~/src/lib/background"
import { IP_ADDRESS_HEADER, authRateLimitStorage } from "~/src/lib/rate-limit"

import { APP_NAME } from "~/src/presentation/branding/app"

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
    user: {
      create: {
        after: handleUserCreated,
      },
      delete: {
        after: handleUserDeleted,
      },
      update: {
        after: handleUserUpdated,
      },
    },
  },
  emailAndPassword: {
    enabled: true,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    onPasswordReset: handlePasswordReset,
    requireEmailVerification: true,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: sendResetPasswordEmail,
  },
  emailVerification: {
    afterEmailVerification: handleEmailVerified,
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: sendVerifyEmail,
  },
  hooks: {
    after: finishEmailChange,
    before: guardAuthRequest,
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
    customRules: RATE_LIMIT_CUSTOM_RULES,
    customStorage: authRateLimitStorage,
    enabled: true,
    max: RATE_LIMIT_MAX_REQUESTS,
    window: RATE_LIMIT_WINDOW_IN_SECONDS,
  },
  secret: env.AUTH_SECRET,
  session: {
    cookieCache: { enabled: false },
    freshAge: SESSION_FRESH_AGE_IN_SECONDS,
    storeSessionInDatabase: true,
    updateAge: SESSION_UPDATE_AGE_IN_SECONDS,
  },
  socialProviders: {
    google: { clientId: env.AUTH_GOOGLE_CLIENT_ID, clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET },
  },
  telemetry: { enabled: false },
  user: {
    additionalFields: {
      formatLocale: {
        input: false,
        required: false,
        type: "string",
      },
      timezone: {
        input: false,
        required: false,
        type: "string",
      },
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: sendChangeEmailConfirmationEmail,
    },
    deleteUser: {
      afterDelete: handleSelfServiceDeletion,
      beforeDelete: prepareSelfServiceDeletion,
      enabled: true,
    },
  },
  verification: { storeIdentifier: "hashed", storeInDatabase: true },
})
