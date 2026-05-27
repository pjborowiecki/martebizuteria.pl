import { adminClient, anonymousClient, multiSessionClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { ac } from "~/src/integrations/better-auth/auth.permissions";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_APP_URL,
  plugins: [adminClient({ ac }), anonymousClient(), multiSessionClient(), twoFactorClient()]
});

export const { signIn, signOut, signUp, useSession, resetPassword } = authClient;
