import { createAuthClient } from "better-auth/react";
import { tanstackStartCookies } from "better-auth/tanstack-start";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_APP_URL,
  plugins: [tanstackStartCookies()]
});

export const { signIn, signOut, signUp, useSession } = authClient;
