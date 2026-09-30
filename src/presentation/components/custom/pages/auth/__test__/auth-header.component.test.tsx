import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { APP_NAME } from "~/src/presentation/branding/app"

import { AuthHeader } from "~/src/presentation/components/custom/pages/auth/auth-header"

afterEach(() => {
  cleanup()
})

describe("AuthHeader", () => {
  it("renders the title as the page heading", () => {
    renderWithProviders(<AuthHeader title="Welcome back" subtitle="Sign in to continue" />)

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Welcome back")
  })

  it("renders the subtitle beneath the heading", () => {
    renderWithProviders(<AuthHeader title="Welcome back" subtitle="Sign in to continue" />)

    expect(screen.getByText("Sign in to continue")).toBeInTheDocument()
  })

  it("links the brand mark back to the home page", () => {
    renderWithProviders(<AuthHeader title="Welcome back" subtitle="Sign in to continue" />)

    expect(screen.getByRole("link", { name: APP_NAME })).toHaveAttribute("href", "/")
  })
})
