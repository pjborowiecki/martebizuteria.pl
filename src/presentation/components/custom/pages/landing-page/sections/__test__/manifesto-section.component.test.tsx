import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ManifestoSection } from "~/src/presentation/components/custom/pages/landing-page/sections/manifesto-section"

describe("ManifestoSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("splits the heading into a title and an italic subtitle", () => {
    renderWithProviders(<ManifestoSection />)

    const heading = screen.getByRole("heading", { level: 2 })

    expect(heading).toHaveTextContent("We don't follow seasons.We follow conviction.")
    expect(screen.getByText("We follow conviction.").tagName).toBe("SPAN")
  })

  it("renders the eyebrow, both paragraphs and the closing line", () => {
    renderWithProviders(<ManifestoSection />)

    expect(screen.getByText("Brand philosophy")).toBeInTheDocument()
    expect(screen.getByText(/in a world rewarding speed/u)).toBeInTheDocument()
    expect(screen.getByText(/Silver is our canvas/u)).toBeInTheDocument()
    expect(screen.queryByText(/This is not fast fashion translated into metal/u)).not.toBeInTheDocument()
    expect(screen.getByText("Welcome to the world of M'ARTE.")).toBeInTheDocument()
  })
})
