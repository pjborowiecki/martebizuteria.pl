import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { NewArrivalsProductCardSkeleton } from "~/src/presentation/components/custom/pages/landing-page/sections/new-arrivals-product-card-skeleton"

describe("NewArrivalsProductCardSkeleton", () => {
  afterEach(() => {
    cleanup()
  })

  it("hides the placeholder from assistive technology", () => {
    const { container } = renderWithProviders(<NewArrivalsProductCardSkeleton />)

    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
  })

  it("renders one image placeholder and three text placeholders", () => {
    const { container } = renderWithProviders(<NewArrivalsProductCardSkeleton />)

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(4)
  })

  it("merges an extra class name onto the wrapper", () => {
    const { container } = renderWithProviders(<NewArrivalsProductCardSkeleton className="col-span-2" />)

    expect(container.firstElementChild).toHaveClass("block", "col-span-2")
  })
})
