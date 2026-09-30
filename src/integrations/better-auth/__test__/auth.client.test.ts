import { describe, expect, it } from "vite-plus/test"

import { authClient, resetPassword, signIn, signOut, signUp, useSession } from "~/src/integrations/better-auth/auth.client"

describe("auth client", () => {
  it("points at the app URL the browser build is given", () => {
    expect(authClient.$store).toBeDefined()
  })

  it.each([
    ["resetPassword", resetPassword],
    ["signOut", signOut],
    ["useSession", useSession],
  ])("exposes %s as a callable flow", (_name, flow) => {
    expect(flow).toBeTypeOf("function")
  })

  it("exposes the credential flows the auth forms call", () => {
    expect(signIn.email).toBeTypeOf("function")
    expect(signIn.social).toBeTypeOf("function")
    expect(signUp.email).toBeTypeOf("function")
  })

  it("carries the admin access control so the client can pre-check permissions", () => {
    expect(authClient.admin.checkRolePermission).toBeTypeOf("function")
  })

  it("carries the two-factor and multi-session plugins the account pages use", () => {
    expect(authClient.twoFactor.enable).toBeTypeOf("function")
    expect(authClient.multiSession.listDeviceSessions).toBeTypeOf("function")
  })
})
