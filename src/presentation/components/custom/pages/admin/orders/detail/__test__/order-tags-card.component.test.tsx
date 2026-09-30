import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OrderTagsCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-tags-card"

afterEach(() => {
  cleanup()
})

describe("OrderTagsCard", () => {
  it("translates each derived tag", () => {
    renderWithProviders(<OrderTagsCard tags={["returning", "locker", "disputed"]} />)

    expect(screen.getByText("Tags")).toBeInTheDocument()
    expect(screen.getByText("Returning customer")).toBeInTheDocument()
    expect(screen.getByText("Locker delivery")).toBeInTheDocument()
    expect(screen.getByText("Disputed")).toBeInTheDocument()
  })

  it("states when an order carries no tags", () => {
    renderWithProviders(<OrderTagsCard tags={[]} />)

    expect(screen.getByText("No tags.")).toBeInTheDocument()
  })
})
