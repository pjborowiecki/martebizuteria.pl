import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, anonymous, multiSession, twoFactor } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";
import { v7 as uuidv7 } from "uuid";

import { CONSTANTS } from "~/src/constants";

import { authActions } from "~/src/integrations/better-auth/auth.actions";
import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.background";
import { ac, ROLES_CONFIG } from "~/src/integrations/better-auth/auth.permissions";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas";

const MAX_FORGET_PASSWORD_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_RESET_PASSWORD_ATTEMPTS = 5;
const MAX_SIGNUP_ATTEMPTS = 3;

const MAX_CONCURRENT_SESSIONS = 5;

const MIN_KV_TTL_IN_SECONDS = 60;
const RATE_LIMIT_MAX_REQUESTS = 100;
const RATE_LIMIT_WINDOW_IN_SECONDS = 60;
const COOKIE_CACHE_MAX_AGE_IN_SECONDS = 300;

const TRUSTED_AUTH_PROVIDERS = ["google", "github"];
const TRUSTED_IP_HEADERS = ["cf-connecting-ip"];

export const auth = betterAuth({
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: TRUSTED_AUTH_PROVIDERS
    }
  },
  advanced: {
    backgroundTasks: { handler: scheduleBackgroundWork },
    database: { generateId: () => uuidv7() },
    ipAddress: {
      ipAddressHeaders: TRUSTED_IP_HEADERS
    }
  },
  appName: CONSTANTS.APP_NAME,
  baseURL: env.VITE_APP_URL,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: authActions.sendResetPassword
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: authActions.sendVerificationEmail
  },
  experimental: { joins: true },
  plugins: [
    admin({
      ac,
      adminRoles: [...CONSTANTS.ADMIN_PANEL_ROLES],
      defaultRole: CONSTANTS.DEFAULT_ROLE,
      roles: ROLES_CONFIG
    }),
    anonymous(),
    multiSession({
      maximumSessions: MAX_CONCURRENT_SESSIONS
    }),
    twoFactor({
      issuer: CONSTANTS.APP_NAME
    }),
    tanstackStartCookies()
  ],
  rateLimit: {
    customRules: {
      [CONSTANTS.ROUTES.API_AUTH.REQUEST_PASSWORD_RESET]: {
        max: MAX_FORGET_PASSWORD_ATTEMPTS,
        window: RATE_LIMIT_WINDOW_IN_SECONDS
      },
      [CONSTANTS.ROUTES.API_AUTH.RESET_PASSWORD]: {
        max: MAX_RESET_PASSWORD_ATTEMPTS,
        window: RATE_LIMIT_WINDOW_IN_SECONDS
      },
      [CONSTANTS.ROUTES.API_AUTH.SIGN_IN_EMAIL]: {
        max: MAX_LOGIN_ATTEMPTS,
        window: RATE_LIMIT_WINDOW_IN_SECONDS
      },
      [CONSTANTS.ROUTES.API_AUTH.SIGN_UP_EMAIL]: {
        max: MAX_SIGNUP_ATTEMPTS,
        window: RATE_LIMIT_WINDOW_IN_SECONDS
      }
    },
    enabled: true,
    max: RATE_LIMIT_MAX_REQUESTS,
    storage: "secondary-storage",
    window: RATE_LIMIT_WINDOW_IN_SECONDS
  },
  secondaryStorage: {
    delete: (key: string) => env.CACHE.delete(key),
    get: async (key: string) => (await env.CACHE.get(key, "json")) ?? undefined,
    set: (key: string, value: unknown, ttl?: number) =>
      env.CACHE.put(key, JSON.stringify(value), {
        expirationTtl: Math.max(ttl ?? MIN_KV_TTL_IN_SECONDS, MIN_KV_TTL_IN_SECONDS)
      })
  },
  secret: env.AUTH_SECRET,
  session: { cookieCache: { enabled: true, maxAge: COOKIE_CACHE_MAX_AGE_IN_SECONDS } },
  socialProviders: {
    github: { clientId: env.AUTH_GITHUB_CLIENT_ID, clientSecret: env.AUTH_GITHUB_CLIENT_SECRET },
    google: { clientId: env.AUTH_GOOGLE_CLIENT_ID, clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET }
  },
  telemetry: { enabled: false },
  trustedOrigins: [env.VITE_APP_URL],
  user: {
    additionalFields: {
      timezone: {
        input: true,
        required: false,
        type: "string"
      }
    },
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: authActions.sendChangeEmailConfirmation
    }
  }
});
