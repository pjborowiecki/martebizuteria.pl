import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type SignUpFormValues } from "~/src/integrations/better-auth/auth.zod"

const signUp = vi.hoisted(() => ({
  isPending: false,
  issueTurnstileToken: vi.fn<(request: { action: string; container: HTMLElement }) => Promise<string>>(),
  mutate: vi.fn<(values: SignUpFormValues) => void>(),
  useSignUpWithPassword: vi.fn<(requestTurnstileToken: () => Promise<string>) => void>(),
}))

vi.mock("~/src/presentation/components/custom/pages/auth/hooks/use-sign-up-with-password", () => ({
  useSignUpWithPassword: (requestTurnstileToken: () => Promise<string>) => {
    signUp.useSignUpWithPassword(requestTurnstileToken)

    return { isPending: signUp.isPending, mutate: signUp.mutate }
  },
}))
vi.mock("~/src/integrations/cloudflare-turnstile/turnstile.client", () => ({ issueTurnstileToken: signUp.issueTurnstileToken }))

import { SignUpWithPasswordForm } from "~/src/presentation/components/custom/pages/auth/sign-up-with-password-form"

const VALID = {
  confirmPassword: "Str0ng!Pass",
  email: "ada@example.test",
  firstName: "Ada",
  lastName: "Kowalska",
  password: "Str0ng!Pass",
}

const field = (label: RegExp): HTMLElement => screen.getByLabelText(label)

const submit = (): HTMLElement => screen.getByRole("button", { name: /Create account/u })

const fill = async (values: SignUpFormValues) => {
  await userEvent.type(field(/^First name/u), values.firstName)
  await userEvent.type(field(/^Last name/u), values.lastName)
  await userEvent.type(field(/^Email address/u), values.email)
  await userEvent.type(field(/^Password/u), values.password)
  await userEvent.type(field(/^Confirm password/u), values.confirmPassword)
}

beforeEach(() => {
  vi.clearAllMocks()
  signUp.isPending = false
})

afterEach(() => {
  cleanup()
})

describe("SignUpWithPasswordForm bot check", () => {
  it("lets the sign-up ask for a token from the sign-up bot check, run in a slot above the submit button", async () => {
    signUp.issueTurnstileToken.mockResolvedValue("turnstile-token-1")
    renderWithProviders(<SignUpWithPasswordForm />)
    const requestTurnstileToken = signUp.useSignUpWithPassword.mock.lastCall?.[0]

    await expect(requestTurnstileToken?.()).resolves.toBe("turnstile-token-1")

    const slot = signUp.issueTurnstileToken.mock.lastCall?.[0].container
    expect(signUp.issueTurnstileToken).toHaveBeenCalledExactlyOnceWith({ action: "sign-up", container: slot })
    expect(slot?.nextElementSibling).toBe(submit())
    expect(slot).toHaveClass("empty:hidden")
  })
})

describe("SignUpWithPasswordForm fields", () => {
  it("asks for both names, an email and the password twice", () => {
    renderWithProviders(<SignUpWithPasswordForm />)

    expect(field(/^First name/u)).toHaveAttribute("autocomplete", "given-name")
    expect(field(/^Last name/u)).toHaveAttribute("autocomplete", "family-name")
    expect(field(/^Email address/u)).toHaveAttribute("type", "email")
    expect(field(/^Password/u)).toHaveAttribute("type", "password")
    expect(field(/^Confirm password/u)).toHaveAttribute("type", "password")
  })

  it("marks every field as required for assistive technology", () => {
    renderWithProviders(<SignUpWithPasswordForm />)

    expect(field(/^First name/u)).toHaveAttribute("aria-required", "true")
    expect(field(/^Confirm password/u)).toHaveAttribute("aria-required", "true")
  })
})

describe("SignUpWithPasswordForm validation", () => {
  it("refuses an empty form and names the missing fields", async () => {
    renderWithProviders(<SignUpWithPasswordForm />)

    await userEvent.click(submit())

    expect(await screen.findByText("First name is required.")).toBeInTheDocument()
    expect(screen.getByText("Last name is required.")).toBeInTheDocument()
    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument()
    expect(signUp.mutate).not.toHaveBeenCalled()
  })

  it("refuses an address that is not an email", async () => {
    renderWithProviders(<SignUpWithPasswordForm />)

    await fill({ ...VALID, email: "ada@@example" })
    await userEvent.click(submit())

    expect(await screen.findByText("Please enter a valid email address.")).toBeInTheDocument()
    expect(signUp.mutate).not.toHaveBeenCalled()
  })

  it("refuses a password without an uppercase letter", async () => {
    renderWithProviders(<SignUpWithPasswordForm />)

    await fill({ ...VALID, confirmPassword: "str0ng!pass", password: "str0ng!pass" })
    await userEvent.click(submit())

    expect(await screen.findByText("At least one uppercase letter")).toBeInTheDocument()
    expect(signUp.mutate).not.toHaveBeenCalled()
  })

  it("refuses a password without a special character", async () => {
    renderWithProviders(<SignUpWithPasswordForm />)

    await fill({ ...VALID, confirmPassword: "Str0ngPass", password: "Str0ngPass" })
    await userEvent.click(submit())

    expect(await screen.findByText("At least one special character")).toBeInTheDocument()
    expect(signUp.mutate).not.toHaveBeenCalled()
  })

  it("refuses a confirmation that does not match", async () => {
    renderWithProviders(<SignUpWithPasswordForm />)

    await fill({ ...VALID, confirmPassword: "Other!Pass1" })
    await userEvent.click(submit())

    expect(await screen.findByText("Passwords do not match.")).toBeInTheDocument()
    expect(signUp.mutate).not.toHaveBeenCalled()
  })
})

describe("SignUpWithPasswordForm submission", () => {
  it("hands the whole form to the sign-up mutation once it validates", async () => {
    renderWithProviders(<SignUpWithPasswordForm />)

    await fill(VALID)
    await userEvent.click(submit())

    await waitFor(() => {
      expect(signUp.mutate).toHaveBeenCalledWith(VALID)
    })
  })

  it("shows the idle label and no spinner while nothing is in flight", () => {
    renderWithProviders(<SignUpWithPasswordForm />)

    expect(submit()).toBeEnabled()
    expect(submit()).toHaveTextContent("Create account")
  })

  it("locks the form and announces progress while the sign-up runs", () => {
    signUp.isPending = true
    renderWithProviders(<SignUpWithPasswordForm />)

    const pendingSubmit = screen.getByRole("button", { name: /Creating account/u })

    expect(pendingSubmit).toBeDisabled()
    expect(pendingSubmit).toHaveTextContent("Creating account…")
    expect(field(/^First name/u)).toBeDisabled()
    expect(field(/^Confirm password/u)).toBeDisabled()
  })
})
