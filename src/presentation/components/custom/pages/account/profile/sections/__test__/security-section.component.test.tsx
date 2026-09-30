import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { SecuritySection } from "~/src/presentation/components/custom/pages/account/profile/sections/security-section"

afterEach(() => {
  cleanup()
})

describe("SecuritySection", () => {
  it("heads the section with the translated security title", () => {
    renderWithProviders(<SecuritySection />)

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Login & Security")
  })

  it("describes the password row", () => {
    renderWithProviders(<SecuritySection />)

    expect(screen.getByText("Change Password")).toBeInTheDocument()
    expect(screen.getByText("Update your password to secure your account")).toBeInTheDocument()
  })

  it("describes the two factor row", () => {
    renderWithProviders(<SecuritySection />)

    expect(screen.getByText("Two-Factor Authentication (2FA)")).toBeInTheDocument()
    expect(screen.getByText("Add an extra layer of security to your account")).toBeInTheDocument()
  })

  it("offers one action per security row", () => {
    renderWithProviders(<SecuritySection />)

    expect(screen.getByRole("button", { name: "Update" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Enable" })).toBeInTheDocument()
  })
})
