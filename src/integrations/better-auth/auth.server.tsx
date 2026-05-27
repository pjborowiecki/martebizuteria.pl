import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, anonymous, multiSession, twoFactor } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";
import { render } from "react-email";
import { v7 as uuidv7 } from "uuid";

import { CONSTANTS } from "~/src/constants";

import { ac, ROLES_CONFIG } from "~/src/integrations/better-auth/auth.permissions";
import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.utils";
import { sendEmail } from "~/src/integrations/cloudflare-email-service/email";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas";
import { ChangeEmail, getChangeEmailSubject } from "~/src/integrations/react-email/templates/change-email";
import { ResetPassword, getResetPasswordSubject } from "~/src/integrations/react-email/templates/reset-password";
import { VerifyEmail, getVerifyEmailSubject } from "~/src/integrations/react-email/templates/verify-email";

import { getCurrentLocale } from "~/src/lib/_utils/locale";

const MAX_FORGET_PASSWORD_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const MAX_RESET_PASSWORD_ATTEMPTS = 5;
const MAX_SIGNUP_ATTEMPTS = 3;

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
    sendResetPassword: async ({ user, url }) => {
      const locale = getCurrentLocale();

      scheduleBackgroundWork(
        sendEmail({
          html: await render(<ResetPassword name={user.name} resetPasswordUrl={url} locale={locale} />),
          subject: getResetPasswordSubject(locale),
          text: await render(<ResetPassword name={user.name} resetPasswordUrl={url} locale={locale} />, { plainText: true }),
          to: user.email
        })
      );
    }
  },
  emailVerification: {
    autoSignInAfterVerification: true,
    sendOnSignUp: true,
    sendVerificationEmail: async ({
      user,
      url
    }: {
      readonly url: string;
      readonly user: { readonly email: string; readonly name: string };
    }) => {
      const locale = getCurrentLocale();

      scheduleBackgroundWork(
        sendEmail({
          html: await render(<VerifyEmail name={user.name} verificationUrl={url} locale={locale} />),
          subject: getVerifyEmailSubject(locale),
          text: await render(<VerifyEmail name={user.name} verificationUrl={url} locale={locale} />, {
            plainText: true
          }),
          to: user.email
        })
      );
    }
  },
  experimental: { joins: true },
  plugins: [
    admin({
      ac,
      adminRoles: [CONSTANTS.ROLES.ADMIN, CONSTANTS.ROLES.MANAGER],
      defaultRole: CONSTANTS.ROLES.USER,
      roles: ROLES_CONFIG
    }),
    anonymous(),
    multiSession({
      maximumSessions: 5
    }),
    twoFactor({
      issuer: CONSTANTS.APP_NAME
    }),
    tanstackStartCookies()
  ],
  rateLimit: {
    customRules: {
      [CONSTANTS.ROUTES.API_AUTH.FORGET_PASSWORD]: {
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
    delete: async (key: string) => {
      await env.CACHE.delete(key);
    },
    get: async (key: string) => {
      const value = await env.CACHE.get(key);
      return value === null ? undefined : (JSON.parse(value) as unknown);
    },
    set: async (key: string, value: unknown, ttl?: number) => {
      const kvTtl = ttl === undefined ? MIN_KV_TTL_IN_SECONDS : Math.max(ttl, MIN_KV_TTL_IN_SECONDS);
      await env.CACHE.put(key, JSON.stringify(value), { expirationTtl: kvTtl });
    }
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
    additionalFields: {},
    changeEmail: {
      enabled: true,
      sendChangeEmailConfirmation: async ({
        user,
        url
      }: {
        readonly url: string;
        readonly user: { readonly email: string; readonly name: string };
      }) => {
        const locale = getCurrentLocale();

        scheduleBackgroundWork(
          sendEmail({
            html: await render(<ChangeEmail name={user.name} verificationUrl={url} locale={locale} />),
            subject: getChangeEmailSubject(locale),
            text: await render(<ChangeEmail name={user.name} verificationUrl={url} locale={locale} />, {
              plainText: true
            }),
            to: user.email
          })
        );
      }
    }
  }
});
