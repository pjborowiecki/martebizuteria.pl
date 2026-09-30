import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { useActionError } from "~/src/hooks/use-action-error"

const ActionErrorMessage = ({ error }: Readonly<{ error: unknown }>): JSX.Element => {
  const describeError = useActionError()

  return <p>{describeError(error)}</p>
}

const named = (name: string, message: string): Error => {
  const error = new Error(message)
  error.name = name

  return error
}

const messageFor = (error: unknown): string => {
  renderWithProviders(<ActionErrorMessage error={error} />)

  return screen.getByRole("paragraph").textContent
}

afterEach(() => {
  cleanup()
})

describe("useActionError with an application error code", () => {
  it("translates a thrown FORBIDDEN code", () => {
    expect(messageFor(new Error(ERROR_CODES.FORBIDDEN))).toBe("You don't have permission to do this.")
  })

  it("translates a thrown CONFLICT code", () => {
    expect(messageFor(new Error(ERROR_CODES.CONFLICT))).toBe("This already exists.")
  })

  it("translates a thrown TOO_MANY_REQUESTS code", () => {
    expect(messageFor(new Error(ERROR_CODES.TOO_MANY_REQUESTS))).toBe("Too many attempts. Please try again shortly.")
  })
})

describe("useActionError with a better-auth failure", () => {
  it("translates an auth message key carried in the error message", () => {
    expect(messageFor(new Error(AUTH_ERRORS.EMAIL_NOT_VERIFIED))).toBe("Please verify your email address first.")
  })

  it("translates a better-auth response code", () => {
    expect(messageFor({ code: "USER_NOT_FOUND" })).toBe("No account found with this email.")
  })

  it("translates a better-auth code nested under a response body", () => {
    expect(messageFor({ body: { code: "BANNED_USER" } })).toBe("Your account has been suspended.")
  })

  it("falls back to the generic message for an unrecognised auth code", () => {
    expect(messageFor({ code: "TEAPOT" })).toBe("Something went wrong. Please try again.")
  })
})

describe("useActionError with a validation failure", () => {
  it.each([["ZodError"], ["ValidationError"]])("translates an error named %s as a form problem", (name) => {
    expect(messageFor(named(name, "schema mismatch"))).toBe("Please check the form and try again.")
  })

  it("prefers a known message key over the error name", () => {
    expect(messageFor(named("ZodError", AUTH_ERRORS.INVALID_EMAIL))).toBe("Please enter a valid email address.")
  })
})

describe("useActionError with an unrecognised failure", () => {
  it.each([[new Error("kaboom")], ["kaboom"], [undefined], [null], [42]])("falls back to the internal error for %j", (error) => {
    expect(messageFor(error)).toBe("Something went wrong. Please try again.")
  })

  it("does not leak the raw error message to the shopper", () => {
    expect(messageFor(new Error("D1_ERROR: no such column: secret"))).not.toContain("D1_ERROR")
  })
})
