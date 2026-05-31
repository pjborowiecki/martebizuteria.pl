import { adminClient, anonymousClient, inferAdditionalFields, multiSessionClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import type { auth } from "~/src/integrations/better-auth/auth._server";
import { ac, ROLES_CONFIG } from "~/src/integrations/better-auth/auth.permissions";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_APP_URL,
  plugins: [
    adminClient({ ac, roles: ROLES_CONFIG }),
    anonymousClient(),
    inferAdditionalFields<typeof auth>(),
    multiSessionClient(),
    twoFactorClient()
  ]
});

export const { signIn, signOut, signUp, useSession, resetPassword } = authClient;
