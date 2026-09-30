import { APIError } from "better-auth/api"
import { describe, expect, it } from "vite-plus/test"

import { AUTH_ERRORS, authErrorKey } from "~/src/integrations/better-auth/auth.errors"

describe("auth error keys", () => {
  it("translates a code carried on the error itself", () => {
    expect(authErrorKey({ code: "INVALID_EMAIL_OR_PASSWORD" })).toBe(AUTH_ERRORS.INVALID_EMAIL_OR_PASSWORD)
  })

  it("translates a code carried in a Better Auth response body", () => {
    expect(authErrorKey(new APIError("BAD_REQUEST", { code: "PASSWORD_TOO_SHORT", message: "Private details" }))).toBe(
      AUTH_ERRORS.PASSWORD_TOO_SHORT,
    )
  })

  it.each([[{ code: "SOMETHING_NEW" }], [new Error("network down")], [null], [undefined], ["INVALID_EMAIL"], [{ body: {} }]])(
    "falls back to the unknown key for %j",
    (error) => {
      expect(authErrorKey(error)).toBe(AUTH_ERRORS.UNKNOWN_ERROR)
    },
  )
})
