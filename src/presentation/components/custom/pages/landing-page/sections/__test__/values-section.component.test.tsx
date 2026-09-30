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

import { ValuesSection } from "~/src/presentation/components/custom/pages/landing-page/sections/values-section"

describe("ValuesSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the eyebrow and the section heading", () => {
    renderWithProviders(<ValuesSection />)

    expect(screen.getByText("The M'ARTE standard")).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 2, name: "Quality of the highest purity" })).toBeInTheDocument()
  })

  it("renders one sub heading per value", () => {
    renderWithProviders(<ValuesSection />)

    expect(screen.getByRole("heading", { level: 3, name: "Hand precision" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Precious materials" })).toBeInTheDocument()
    expect(screen.getByRole("heading", { level: 3, name: "Details that bring joy" })).toBeInTheDocument()
  })

  it("renders the description of every value", () => {
    renderWithProviders(<ValuesSection />)

    expect(screen.getByText(/You receive a detail perfected by artisans/u)).toBeInTheDocument()
    expect(screen.getByText(/925 silver and selected minerals/u)).toBeInTheDocument()
    expect(screen.getByText(/From the moment of choice to opening the box/u)).toBeInTheDocument()
  })

  it("labels the illustration with the craft value title", () => {
    renderWithProviders(<ValuesSection />)

    expect(screen.getByAltText("Hand precision")).toBeInTheDocument()
  })
})
