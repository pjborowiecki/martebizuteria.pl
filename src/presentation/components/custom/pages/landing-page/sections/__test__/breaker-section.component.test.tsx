import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { BreakerSection } from "~/src/presentation/components/custom/pages/landing-page/sections/breaker-section"

describe("BreakerSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the translated breaker line", () => {
    renderWithProviders(<BreakerSection />)

    expect(screen.getByText("Quiet luxury, built on intention.")).toBeInTheDocument()
  })

  it("renders the line inside a section that takes part in the reveal animation", () => {
    const { container } = renderWithProviders(<BreakerSection />)

    expect(container.querySelector("section")).toBeInTheDocument()
    expect(container.querySelector(".reveal")).toBeInTheDocument()
  })
})
