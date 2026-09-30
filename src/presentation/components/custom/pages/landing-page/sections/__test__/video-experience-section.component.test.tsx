import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.hoisted(() => {
  Object.defineProperty(globalThis, "matchMedia", {
    configurable: true,
    value: (query: string) => ({
      addEventListener: () => {},
      addListener: () => {},
      dispatchEvent: () => false,
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => {},
      removeListener: () => {},
    }),
    writable: true,
  })
})

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { VideoExperienceSection } from "~/src/presentation/components/custom/pages/landing-page/sections/video-experience-section"

describe("VideoExperienceSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the two heading lines", () => {
    renderWithProviders(<VideoExperienceSection />)

    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("We co-createwhat is unique.")
  })

  it("renders the eyebrow and the description", () => {
    renderWithProviders(<VideoExperienceSection />)

    expect(screen.getByText("Handcrafted")).toBeInTheDocument()
    expect(screen.getByText(/Some stories deserve their own shape/u)).toBeInTheDocument()
  })

  it("plays the ambience video muted, looping and inline", () => {
    renderWithProviders(<VideoExperienceSection />)

    const video = screen.getByLabelText("M'Arte atelier ambience video")

    expect(video.tagName).toBe("VIDEO")
    expect(video).toHaveAttribute("loop")
    expect(video).toHaveAttribute("preload", "auto")
    expect(video).toHaveAttribute("poster")
  })

  it("links the two calls to action to collections and products", () => {
    renderWithProviders(<VideoExperienceSection />)

    expect(screen.getByRole("link", { name: "View collections" })).toHaveAttribute("href", "/collections")
    expect(screen.getByRole("link", { name: "Explore all products" })).toHaveAttribute("href", "/products")
  })

  it("anchors the section for the experience navigation link", () => {
    const { container } = renderWithProviders(<VideoExperienceSection />)

    expect(container.querySelector("section")).toHaveAttribute("id", "experience")
  })
})
