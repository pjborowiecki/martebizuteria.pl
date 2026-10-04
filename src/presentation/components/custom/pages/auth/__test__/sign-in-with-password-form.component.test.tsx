import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface SignInRequest {
  readonly email: string
  readonly fetchOptions: {
    readonly onError: (context: { error: unknown }) => void
    readonly onSuccess: (context: { data: unknown }) => Promise<void> | void
  }
  readonly password: string
}

const auth = vi.hoisted(() => {
  const requests: SignInRequest[] = []
  const outcome: { current: { data?: unknown; error?: unknown; kind: "error" | "pending" | "success" } } = { current: { kind: "success" } }
  const inFlight: { release: (() => void) | undefined } = { release: undefined }

  return {
    inFlight,
    outcome,
    requests,
    signInEmail: vi.fn(async (input: SignInRequest): Promise<void> => {
      requests.push(input)

      if (outcome.current.kind === "pending") {
        await new Promise<void>((resolve) => {
          inFlight.release = resolve
        })
      } else if (outcome.current.kind === "success") {
        await input.fetchOptions.onSuccess({ data: outcome.current.data ?? {} })
      } else {
        input.fetchOptions.onError({ error: outcome.current.error })
      }
    }),
  }
})

const verification = vi.hoisted(() => ({
  send: vi.fn<(input: { callbackURL: string; email: string }) => Promise<{ data: unknown; error: unknown }>>(),
}))

const postAuth = vi.hoisted(() => ({ redirect: vi.fn<() => Promise<void>>() }))

const toasts = vi.hoisted(() => ({
  error: vi.fn<(title: string, options: { description: string }) => void>(),
  success: vi.fn<(title: string, options: { description: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: toasts.error, success: toasts.success } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({
  authClient: { sendVerificationEmail: verification.send },
  signIn: { email: auth.signInEmail },
}))
vi.mock("~/src/hooks/use-post-auth-redirect", () => ({ usePostAuthRedirect: () => postAuth.redirect }))

import { SignInWithPasswordForm } from "~/src/presentation/components/custom/pages/auth/sign-in-with-password-form"

import { ROUTES } from "~/src/routes"

const emailField = (): HTMLElement => screen.getByLabelText(/^Email address/u)

const passwordField = (): HTMLElement => screen.getByLabelText(/^Password/u)

const submit = (): HTMLElement => screen.getByRole("button", { name: /Sign in/u })

const signInAs = async (email = "ada@example.test", password = "Str0ng!Pass") => {
  await userEvent.type(emailField(), email)
  await userEvent.type(passwordField(), password)
  await userEvent.click(submit())
}

beforeEach(() => {
  vi.clearAllMocks()
  verification.send.mockResolvedValue({ data: { status: true }, error: null })
  auth.requests.length = 0
  auth.outcome.current = { kind: "success" }
  auth.inFlight.release = undefined
})

afterEach(() => {
  auth.inFlight.release?.()
  cleanup()
})

describe("SignInWithPasswordForm fields", () => {
  it("asks for the email and the current password", () => {
    renderWithProviders(<SignInWithPasswordForm />)

    expect(emailField()).toHaveAttribute("type", "email")
    expect(emailField()).toHaveAttribute("autocomplete", "email")
    expect(passwordField()).toHaveAttribute("type", "password")
    expect(passwordField()).toHaveAttribute("autocomplete", "current-password")
  })

  it("marks both fields as required for assistive technology", () => {
    renderWithProviders(<SignInWithPasswordForm />)

    expect(emailField()).toHaveAttribute("aria-required", "true")
    expect(passwordField()).toHaveAttribute("aria-required", "true")
  })

  it("offers the way out to the password reset flow", () => {
    renderWithProviders(<SignInWithPasswordForm />)

    expect(screen.getByRole("link", { name: "Forgot password?" })).toHaveAttribute("href", ROUTES.AUTH_FORGOT_PASSWORD)
  })
})

describe("SignInWithPasswordForm two-factor challenge", () => {
  it("asks for a code instead of signing in when the account has 2FA", async () => {
    auth.outcome.current = { data: { twoFactorRedirect: true }, kind: "success" }
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    expect(await screen.findByRole("heading", { name: "Two-step verification" })).toBeInTheDocument()
    expect(postAuth.redirect).not.toHaveBeenCalled()
    expect(toasts.success).not.toHaveBeenCalled()
  })

  it("returns to the password form when the shopper backs out of the challenge", async () => {
    auth.outcome.current = { data: { twoFactorRedirect: true }, kind: "success" }
    renderWithProviders(<SignInWithPasswordForm />)
    await signInAs()
    await screen.findByRole("heading", { name: "Two-step verification" })

    fireEvent.click(screen.getByRole("button", { name: "Back to sign in" }))

    expect(emailField()).toBeInTheDocument()
  })
})

describe("SignInWithPasswordForm validation", () => {
  it("refuses an empty form and names what is missing", async () => {
    renderWithProviders(<SignInWithPasswordForm />)

    await userEvent.click(submit())

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument()
    expect(screen.getByText("Password is required.")).toBeInTheDocument()
    expect(auth.signInEmail).not.toHaveBeenCalled()
  })

  it("refuses an address that is not an email", async () => {
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs("ada@@example")

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument()
    expect(auth.signInEmail).not.toHaveBeenCalled()
  })
})

describe("SignInWithPasswordForm submission", () => {
  it("sends the credentials the shopper typed", async () => {
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    await waitFor(() => {
      expect(auth.requests[0]).toMatchObject({ email: "ada@example.test", password: "Str0ng!Pass" })
    })
  })

  it("welcomes the shopper back once the credentials are accepted", async () => {
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledWith("Welcome back", { description: "You're signed in to your M'Arte account." })
    })
  })

  it("hands the signed-in shopper to the post-sign-in redirect", async () => {
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    await waitFor(() => {
      expect(postAuth.redirect).toHaveBeenCalledOnce()
    })
  })

  it("explains a rejected password without navigating away", async () => {
    auth.outcome.current = { error: { code: "INVALID_EMAIL_OR_PASSWORD" }, kind: "error" }
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", { description: "Invalid email or password." })
    })
    expect(postAuth.redirect).not.toHaveBeenCalled()
  })

  it("falls back to the generic message for an error nobody mapped", async () => {
    auth.outcome.current = { error: { code: "SOMETHING_NEW" }, kind: "error" }
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", { description: "Something went wrong. Please try again." })
    })
  })

  it("shows the idle label while nothing is in flight", () => {
    renderWithProviders(<SignInWithPasswordForm />)

    expect(submit()).toBeEnabled()
    expect(submit()).toHaveTextContent("Sign in")
  })

  it("locks the button and announces progress while the sign in runs", async () => {
    auth.outcome.current = { kind: "pending" }
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    const pending = await screen.findByRole("button", { name: /Signing in/u })

    expect(pending).toBeDisabled()
    expect(emailField()).toBeDisabled()
    expect(passwordField()).toBeDisabled()
  })
})

const resendButton = (): Promise<HTMLElement> => screen.findByRole("button", { name: "Send the confirmation link again" })

const signInUnverified = async () => {
  auth.outcome.current = { error: { code: "EMAIL_NOT_VERIFIED", status: 403 }, kind: "error" }
  renderWithProviders(<SignInWithPasswordForm />)
  await signInAs()
}

describe("SignInWithPasswordForm for an address that is not confirmed yet", () => {
  it("offers to resend the confirmation link once the password proved the account is waiting", async () => {
    await signInUnverified()

    expect(await resendButton()).toBeEnabled()
    expect(screen.getByText("This address hasn't been confirmed yet. We can send you a new confirmation link.")).toBeInTheDocument()
    expect(toasts.error).toHaveBeenCalledWith("Something went wrong", { description: "Please verify your email address first." })
  })

  it("asks for a new link to the address that was signed in with, landing on the account afterwards", async () => {
    await signInUnverified()

    await userEvent.click(await resendButton())

    await waitFor(() => {
      expect(verification.send).toHaveBeenCalledWith({ callbackURL: "/en-US/account/overview?verified=true", email: "ada@example.test" })
    })
  })

  it("says a new link is on its way only after the send went through", async () => {
    await signInUnverified()

    await userEvent.click(await resendButton())

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledWith("Check your inbox", {
        description: "A new confirmation link is on its way to ada@example.test.",
      })
    })
  })

  it("locks the resend button while the new link is being sent", async () => {
    const delivery = Promise.withResolvers<{ data: unknown; error: unknown }>()
    verification.send.mockReturnValue(delivery.promise)
    await signInUnverified()

    await userEvent.click(await resendButton())

    expect(await screen.findByRole("button", { name: "Sending…" })).toBeDisabled()
    expect(toasts.success).not.toHaveBeenCalled()

    delivery.resolve({ data: { status: true }, error: null })

    expect(await resendButton()).toBeEnabled()
  })

  it.each([
    ["EMAIL_DELIVERY_FAILED", "We couldn't send the email just now. Please try again in a few minutes."],
    ["EMAIL_DELIVERY_UNAVAILABLE", "We can't send emails at the moment, so nothing has been changed. Please try again in a few minutes."],
  ])("explains a resend refused with %s and keeps the offer to try again", async (code, description) => {
    verification.send.mockResolvedValue({ data: null, error: { code, status: 503 } })
    await signInUnverified()
    toasts.error.mockClear()

    await userEvent.click(await resendButton())

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", { description })
    })
    expect(toasts.success).not.toHaveBeenCalled()
    expect(await resendButton()).toBeEnabled()
  })

  it("offers no resend when the password was wrong", async () => {
    auth.outcome.current = { error: { code: "INVALID_EMAIL_OR_PASSWORD", status: 401 }, kind: "error" }
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledOnce()
    })
    expect(screen.queryByRole("button", { name: "Send the confirmation link again" })).not.toBeInTheDocument()
  })
})
