import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { OrderNotesCard } from "~/src/presentation/components/custom/pages/admin/orders/detail/order-notes-card"

afterEach(() => {
  cleanup()
})

describe("OrderNotesCard", () => {
  it("prints the note the customer left at checkout", () => {
    renderWithProviders(<OrderNotesCard customerNote="Please gift wrap." />)

    expect(screen.getByText("Customer Note")).toBeInTheDocument()
    expect(screen.getByText("Please gift wrap.")).toBeInTheDocument()
  })

  it("states when the customer left no note", () => {
    renderWithProviders(<OrderNotesCard customerNote={undefined} />)

    expect(screen.getByText("The customer did not leave a note.")).toBeInTheDocument()
  })
})
