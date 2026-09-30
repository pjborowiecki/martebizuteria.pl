import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://assets.test",
  getAssetURL: (path: string) => `https://assets.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: () => true,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

import { ImageShowcase } from "~/src/presentation/components/custom/pages/landing-page/navigation/components/fullscreen-menu/image-showcase"
import { PRIMARY } from "~/src/presentation/components/custom/pages/landing-page/navigation/constants"

afterEach(() => {
  cleanup()
})

describe("ImageShowcase", () => {
  it("renders one image per primary menu entry", () => {
    renderWithProviders(<ImageShowcase />)

    expect(screen.getAllByAltText("Editorial jewelry")).toHaveLength(PRIMARY.length)
  })

  it("shows only the first image and hides the rest", () => {
    const { container } = renderWithProviders(<ImageShowcase />)
    const slides = [...container.querySelectorAll("[data-menu-image]")]

    expect(slides[0]).toHaveStyle({ opacity: "1" })
    expect(slides.slice(1).map((slide) => slide.getAttribute("style"))).toStrictEqual(
      slides.slice(1).map(() => "opacity: 0; visibility: hidden;"),
    )
  })

  it("indexes every slide in menu order", () => {
    const { container } = renderWithProviders(<ImageShowcase />)
    const indexes = [...container.querySelectorAll<HTMLElement>("[data-menu-image]")].map((slide) => slide.dataset["menuImage"])

    expect(indexes).toStrictEqual(PRIMARY.map((_item, index) => String(index)))
  })

  it("loads the first image eagerly and the rest lazily", () => {
    renderWithProviders(<ImageShowcase />)
    const images = screen.getAllByAltText("Editorial jewelry")

    expect(images[0]).toHaveAttribute("loading", "eager")
    expect(images[1]).toHaveAttribute("loading", "lazy")
  })
})
