import { adminClient, anonymousClient, inferAdditionalFields, multiSessionClient, twoFactorClient } from "better-auth/client/plugins"
import { createAuthClient } from "better-auth/react"

import { ROLES_CONFIG, ac } from "~/src/integrations/better-auth/auth.access"
import { type auth } from "~/src/integrations/better-auth/auth.server"

export const authClient = createAuthClient({
  plugins: [
    adminClient({ ac, roles: ROLES_CONFIG }),
    anonymousClient(),
    inferAdditionalFields<typeof auth>(),
    multiSessionClient(),
    twoFactorClient(),
  ],
})

export const { signIn, signOut, signUp, useSession, resetPassword } = authClient
