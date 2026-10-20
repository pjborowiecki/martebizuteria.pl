import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AuthDivider } from "~/src/presentation/components/custom/pages/auth/auth-divider"

afterEach(() => {
  cleanup()
})

describe("AuthDivider", () => {
  it("renders the translated separator label", () => {
    renderWithProviders(<AuthDivider />)

    expect(screen.getByText("or")).toBeInTheDocument()
  })

  it("shows the label in the muted text colour at full strength", () => {
    renderWithProviders(<AuthDivider />)

    expect(screen.getByText("or")).toHaveClass("text-muted-foreground")
    expect(screen.getByText("or").className).not.toMatch(/text-muted-foreground\//u)
  })

  it("places a rule on each side of the label", () => {
    const { container } = renderWithProviders(<AuthDivider />)

    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(2)
  })
})
