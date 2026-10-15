import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ReadOnlyField } from "~/src/presentation/components/custom/pages/account/profile/read-only-field"

describe("ReadOnlyField", () => {
  afterEach(() => {
    cleanup()
  })

  it("pairs the label with the stored value", () => {
    renderWithProviders(<ReadOnlyField label="Email Address" value="shopper@example.com" />)

    expect(screen.getByRole("term")).toHaveTextContent("Email Address")
    expect(screen.getByRole("definition")).toHaveTextContent("shopper@example.com")
  })

  it("shows the value as text rather than a field the shopper could edit", () => {
    renderWithProviders(<ReadOnlyField label="Email Address" value="shopper@example.com" />)

    expect(screen.queryByRole("textbox")).toBeNull()
  })

  it("leaves the definition empty when no value is stored", () => {
    renderWithProviders(<ReadOnlyField label="Email Address" value="" />)

    expect(screen.getByRole("definition")).toBeEmptyDOMElement()
  })

  it("shows the hint and the action beside the value", () => {
    renderWithProviders(
      <ReadOnlyField action={<button type="button">Change</button>} hint={<p>Not confirmed yet</p>} label="Email Address" value="a@b.c" />,
    )

    expect(screen.getByText("Not confirmed yet")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument()
  })
})
