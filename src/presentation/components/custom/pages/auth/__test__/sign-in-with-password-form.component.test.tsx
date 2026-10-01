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
    session: { current: undefined as { user?: { role?: string } } | undefined },
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

const navigation = vi.hoisted(() => ({ navigate: vi.fn<(options: { to: string }) => void>() }))

const toasts = vi.hoisted(() => ({
  error: vi.fn<(title: string, options: { description: string }) => void>(),
  success: vi.fn<(title: string, options: { description: string }) => void>(),
}))

vi.mock("sonner", () => ({ toast: { error: toasts.error, success: toasts.success } }))
vi.mock("~/src/integrations/better-auth/auth.client", () => ({ signIn: { email: auth.signInEmail } }))
vi.mock("~/src/integrations/better-auth/auth.session", () => ({ getCurrentSession: () => Promise.resolve(auth.session.current) }))
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()

  return { ...actual, useNavigate: () => navigation.navigate }
})

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
  auth.requests.length = 0
  auth.outcome.current = { kind: "success" }
  auth.inFlight.release = undefined
  auth.session.current = { user: { role: "user" } }
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
    expect(navigation.navigate).not.toHaveBeenCalled()
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

  it("sends a customer on to their account overview", async () => {
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith({ to: ROUTES.ACCOUNT_OVERVIEW })
    })
  })

  it("sends an administrator straight to the dashboard", async () => {
    auth.session.current = { user: { role: "admin" } }
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    await waitFor(() => {
      expect(navigation.navigate).toHaveBeenCalledWith({ to: ROUTES.ADMIN })
    })
  })

  it("stays put when the accepted sign in left no session behind", async () => {
    auth.session.current = undefined
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledTimes(1)
    })
    expect(navigation.navigate).not.toHaveBeenCalled()
  })

  it("explains a rejected password without navigating away", async () => {
    auth.outcome.current = { error: { code: "INVALID_EMAIL_OR_PASSWORD" }, kind: "error" }
    renderWithProviders(<SignInWithPasswordForm />)

    await signInAs()

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", { description: "Invalid email or password." })
    })
    expect(navigation.navigate).not.toHaveBeenCalled()
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
