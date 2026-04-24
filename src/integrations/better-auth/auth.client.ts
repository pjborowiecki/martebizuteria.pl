import { createAuthClient } from "better-auth/react";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { env } from "cloudflare:workers";

export const authClient = createAuthClient({
  baseURL: env.VITE_APP_URL,
  plugins: [tanstackStartCookies()]
});

export const { signIn, signUp, signOut, useSession } = authClient;
