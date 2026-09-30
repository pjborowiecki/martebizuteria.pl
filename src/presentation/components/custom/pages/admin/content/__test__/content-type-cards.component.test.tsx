import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CONTENT_TYPES } from "~/src/data/content"

import { ContentTypeCards } from "~/src/presentation/components/custom/pages/admin/content/content-type-cards"

describe("ContentTypeCards", () => {
  afterEach(cleanup)

  it("renders one card per content type", () => {
    const { container } = renderWithProviders(<ContentTypeCards />)

    expect(container.querySelectorAll("[data-slot='card']")).toHaveLength(CONTENT_TYPES.length)
  })

  it.each([
    ["Pages", "Static pages"],
    ["Banners", "Promotional banners"],
    ["Articles", "Blog posts and articles"],
  ])("translates the %s card title and description", (title, description) => {
    renderWithProviders(<ContentTypeCards />)

    expect(screen.getByText(title)).toBeInTheDocument()
    expect(screen.getByText(description)).toBeInTheDocument()
  })

  it.each(CONTENT_TYPES)("shows the $key count", ({ count }) => {
    renderWithProviders(<ContentTypeCards />)

    expect(screen.getByText(String(count))).toBeInTheDocument()
  })
})
