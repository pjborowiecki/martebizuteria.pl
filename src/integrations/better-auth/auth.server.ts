import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";
import { v7 as uuidv7 } from "uuid";

import { CONSTANTS } from "~/src/constants";

import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.utils";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";
import * as schema from "~/src/integrations/drizzle-orm/drizzle.schemas";

const COOKIE_CACHE_MAX_AGE_IN_SECONDS = 300;

export const auth = betterAuth({
  account: { accountLinking: { enabled: true, trustedProviders: ["google", "github"] } },
  advanced: {
    backgroundTasks: { handler: scheduleBackgroundWork },
    database: { generateId: () => uuidv7() }
  },
  appName: CONSTANTS.APP_NAME,
  baseURL: env.VITE_APP_URL,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true },
  experimental: { joins: true },
  plugins: [tanstackStartCookies()],
  secret: env.AUTH_SECRET,
  session: { cookieCache: { enabled: true, maxAge: COOKIE_CACHE_MAX_AGE_IN_SECONDS } },
  socialProviders: {
    github: { clientId: env.AUTH_GITHUB_CLIENT_ID, clientSecret: env.AUTH_GITHUB_CLIENT_SECRET },
    google: { clientId: env.AUTH_GOOGLE_CLIENT_ID, clientSecret: env.AUTH_GOOGLE_CLIENT_SECRET }
  },
  telemetry: { enabled: false },
  trustedOrigins: [env.VITE_APP_URL]
});
