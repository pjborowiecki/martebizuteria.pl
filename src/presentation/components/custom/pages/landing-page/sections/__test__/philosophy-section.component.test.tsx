import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PhilosophySection } from "~/src/presentation/components/custom/pages/landing-page/sections/philosophy-section"

describe("PhilosophySection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the eyebrow and the heading", () => {
    renderWithProviders(<PhilosophySection />)

    expect(screen.getByText("Enduring values")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Designed to endure" })).toBeInTheDocument()
  })

  it("renders both body paragraphs and the signature", () => {
    renderWithProviders(<PhilosophySection />)

    expect(screen.getByText(/We believe in objects that outlast their season\./u)).toBeInTheDocument()
    expect(screen.getByText(/Our studio works at the rhythm of craft, not commerce\./u)).toBeInTheDocument()
    expect(screen.getByText("— M'ARTE")).toBeInTheDocument()
  })
})
