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

  it("places a rule on each side of the label", () => {
    const { container } = renderWithProviders(<AuthDivider />)

    expect(container.querySelectorAll('[data-slot="separator"]')).toHaveLength(2)
  })
})
