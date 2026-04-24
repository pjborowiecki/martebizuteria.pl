import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";
import { v7 as uuidv7 } from "uuid";

import { scheduleBackgroundWork } from "~/src/integrations/better-auth/auth.utils";
import { db } from "~/src/integrations/drizzle-orm/drizzle.database";
import {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification
} from "~/src/integrations/drizzle-orm/drizzle.schemas";

const schema = {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification
};

export const auth = betterAuth({
  advanced: {
    backgroundTasks: { handler: scheduleBackgroundWork },
    database: { generateId: () => uuidv7() }
  },
  baseURL: env.VITE_APP_URL,
  database: drizzleAdapter(db, { provider: "sqlite", schema }),
  emailAndPassword: { enabled: true },
  experimental: { joins: true },
  plugins: [tanstackStartCookies()],
  secret: env.AUTH_SECRET
});
