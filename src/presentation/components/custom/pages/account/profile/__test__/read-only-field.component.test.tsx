import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ReadOnlyField } from "~/src/presentation/components/custom/pages/account/profile/read-only-field"

describe("ReadOnlyField", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the label and the stored value", () => {
    renderWithProviders(<ReadOnlyField label="Email Address" value="shopper@example.com" />)

    expect(screen.getByText("Email Address")).toBeInTheDocument()
    expect(screen.getByRole("textbox")).toHaveValue("shopper@example.com")
  })

  it("keeps the value uneditable", async () => {
    renderWithProviders(<ReadOnlyField label="Email Address" value="shopper@example.com" />)
    const input = screen.getByRole("textbox")

    expect(input).toHaveAttribute("readonly")

    await userEvent.type(input, "edited")

    expect(input).toHaveValue("shopper@example.com")
  })

  it("renders an empty value without collapsing the field", () => {
    renderWithProviders(<ReadOnlyField label="Email Address" value="" />)

    expect(screen.getByRole("textbox")).toHaveValue("")
  })
})
