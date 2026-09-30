import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CheckoutFormSkeleton } from "~/src/presentation/components/custom/checkout/components/checkout-form-skeleton"

afterEach(() => {
  cleanup()
})

describe("CheckoutFormSkeleton", () => {
  it("stands in for the heading and the two form blocks", () => {
    const { container } = renderWithProviders(<CheckoutFormSkeleton />)
    const placeholders = [...container.querySelectorAll("div[data-slot='skeleton']")]

    expect(placeholders).toHaveLength(3)
    expect(placeholders.map((node) => node.className.includes("h-12") || node.className.includes("h-32"))).toStrictEqual([true, true, true])
  })

  it("keeps the square corners of the checkout design", () => {
    const { container } = renderWithProviders(<CheckoutFormSkeleton />)

    for (const placeholder of container.querySelectorAll("div[data-slot='skeleton']")) {
      expect(placeholder.className).toContain("rounded-none")
    }
  })

  it("renders no interactive element while the form loads", () => {
    const { container } = renderWithProviders(<CheckoutFormSkeleton />)

    expect(container.querySelectorAll("button, input, a")).toHaveLength(0)
  })
})
