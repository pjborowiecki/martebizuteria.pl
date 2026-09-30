import { describe, expect, it } from "vite-plus/test"

import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH, PASSWORD_MAX_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import {
  forgotPasswordSchema,
  resetPasswordSchema,
  signInWithPasswordSchema,
  signUpWithPasswordSchema,
} from "~/src/integrations/better-auth/auth.zod"

const strongPassword = "Sekret!2026"

describe("sign-in form", () => {
  it("accepts an email and a password", () => {
    expect(signInWithPasswordSchema.safeParse({ email: "shopper@marte.test", password: "anything" }).success).toBe(true)
  })

  it.each([
    [{ email: "not-an-email", password: "anything" }, "invalidEmail"],
    [{ email: `${"a".repeat(EMAIL_MAX_LENGTH)}@marte.test`, password: "anything" }, "emailMaxLength"],
    [{ email: "shopper@marte.test", password: "" }, "passwordRequired"],
  ])("rejects %j", (input, message) => {
    const parsed = signInWithPasswordSchema.safeParse(input)

    expect(parsed.error?.issues.map((issue) => issue.message)).toContain(message)
  })
})

describe("sign-up form", () => {
  const valid = {
    confirmPassword: strongPassword,
    email: "shopper@marte.test",
    firstName: "Ada",
    lastName: "Lovelace",
    password: strongPassword,
  }

  it("accepts a complete registration", () => {
    expect(signUpWithPasswordSchema.safeParse(valid).success).toBe(true)
  })

  it.each([
    [{ confirmPassword: "Sekret!", password: "Sekret!" }, "passwordMinLength"],
    [{ confirmPassword: "sekret!2026", password: "sekret!2026" }, "passwordUppercase"],
    [{ confirmPassword: "Sekret12026", password: "Sekret12026" }, "passwordSpecialCharacter"],
    [{ confirmPassword: "Different!2026" }, "passwordsMustMatch"],
    [{ firstName: "" }, "firstNameRequired"],
    [{ firstName: "A".repeat(NAME_MAX_LENGTH + 1) }, "nameMaxLength"],
    [{ lastName: "" }, "lastNameRequired"],
    [{ confirmPassword: "" }, "confirmPasswordRequired"],
  ])("rejects %j", (overrides, message) => {
    const parsed = signUpWithPasswordSchema.safeParse({ ...valid, ...overrides })

    expect(parsed.error?.issues.map((issue) => issue.message)).toContain(message)
  })
})

describe("password recovery forms", () => {
  it("asks for a valid email before sending a reset link", () => {
    expect(forgotPasswordSchema.safeParse({ email: "shopper@marte.test" }).success).toBe(true)
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).error?.issues[0]?.message).toBe("invalidEmail")
  })

  it("requires the new password twice", () => {
    expect(resetPasswordSchema.safeParse({ confirmPassword: strongPassword, password: strongPassword }).success).toBe(true)
    expect(resetPasswordSchema.safeParse({ confirmPassword: "Other!2026", password: strongPassword }).error?.issues[0]?.message).toBe(
      "passwordsMustMatch",
    )
  })

  it("holds the new password to the same strength rules", () => {
    const parsed = resetPasswordSchema.safeParse({ confirmPassword: "weak", password: "weak" })

    expect(parsed.error?.issues.map((issue) => issue.message)).toContain("passwordMinLength")
  })

  it("refuses a password longer than the hashing limit", () => {
    const tooLong = `${"A".repeat(PASSWORD_MAX_LENGTH)}a!`
    const parsed = resetPasswordSchema.safeParse({ confirmPassword: tooLong, password: tooLong })

    expect(parsed.error?.issues.map((issue) => issue.message)).toContain("passwordMaxLength")
  })
})
