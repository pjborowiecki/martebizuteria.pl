import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DEMO_ORDER } from "~/src/data/order-detail"

import { OrderNotesCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-notes-card"

afterEach(() => {
  cleanup()
})

describe("OrderNotesCard", () => {
  it("titles the card with the internal notes heading", () => {
    renderWithProviders(<OrderNotesCard />)

    expect(screen.getByText("Internal Notes")).toBeInTheDocument()
  })

  it("shows the note the customer left with the order", () => {
    renderWithProviders(<OrderNotesCard />)

    expect(screen.getByText(DEMO_ORDER.notes)).toBeInTheDocument()
  })

  it("offers an edit action beside the title", () => {
    renderWithProviders(<OrderNotesCard />)

    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument()
  })
})
