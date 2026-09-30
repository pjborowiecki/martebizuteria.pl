import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/presentation/components/custom/pages/auth/sign-up-with-password-form", () => ({
  SignUpWithPasswordForm: (): JSX.Element => <p>sign up form</p>,
}))
vi.mock("~/src/presentation/components/custom/pages/auth/social-providers", () => ({
  SocialProviders: (): JSX.Element => <p>social providers</p>,
}))

import { Route } from "~/src/routes/auth.sign-up"

const SignUpPage = (): JSX.Element => {
  const Page = Route.options.component
  if (Page === undefined) {
    throw new Error("the sign up route renders no component")
  }

  return <Page />
}

afterEach(cleanup)

describe("auth sign up page", () => {
  it("welcomes the visitor with the sign up copy", () => {
    renderWithProviders(<SignUpPage />)

    expect(screen.getByText("Stay with us a little longer")).toBeInTheDocument()
    expect(
      screen.getByText("Track your orders and keep the jewelry that caught your eye, so you can return to it whenever you like."),
    ).toBeInTheDocument()
  })

  it("shows the password form beside the social providers", () => {
    renderWithProviders(<SignUpPage />)

    expect(screen.getByText("sign up form")).toBeInTheDocument()
    expect(screen.getByText("social providers")).toBeInTheDocument()
  })

  it("links the terms and the privacy policy inside the consent sentence", () => {
    renderWithProviders(<SignUpPage />)

    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", "/terms-of-service")
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", "/privacy-policy")
  })

  it("keeps the consent sentence readable around the links", () => {
    const { container } = renderWithProviders(<SignUpPage />)

    expect(container.textContent).toContain("By continuing, you agree to our Terms of Service and Privacy Policy.")
  })

  it("sends a returning customer to the sign in page", () => {
    renderWithProviders(<SignUpPage />)

    expect(screen.getByText("Already have an account?")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/auth/sign-in")
  })
})

describe("auth sign up route", () => {
  it("loads only the sign up namespace", () => {
    expect(Route.options.staticData).toStrictEqual({ namespaces: ["pages.auth.sign-up"] })
  })
})
