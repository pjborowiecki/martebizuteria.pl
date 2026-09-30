import { cleanup, screen } from "@testing-library/react"
import { Mail } from "lucide-react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CustomerFormSection } from "~/src/presentation/components/custom/pages/admin/customers/customer-detail/edit-customer/customer-form-section"

afterEach(() => {
  cleanup()
})

describe("CustomerFormSection", () => {
  it("heads the section with its title", () => {
    renderWithProviders(
      <CustomerFormSection icon={Mail} title="Contact details">
        <input aria-label="Phone" />
      </CustomerFormSection>,
    )

    expect(screen.getByRole("heading", { level: 3, name: "Contact details" })).toBeInTheDocument()
  })

  it("renders its children inside the indented body", () => {
    const { container } = renderWithProviders(
      <CustomerFormSection icon={Mail} title="Contact details">
        <input aria-label="Phone" />
      </CustomerFormSection>,
    )

    expect(container.querySelector("div.space-y-4.pl-6")).toContainElement(screen.getByLabelText("Phone"))
  })

  it("shows the description when one is given", () => {
    renderWithProviders(
      <CustomerFormSection description="Used on the customer profile." icon={Mail} title="Default address">
        <input aria-label="City" />
      </CustomerFormSection>,
    )

    expect(screen.getByText("Used on the customer profile.")).toBeInTheDocument()
  })

  it("omits the description paragraph when none is given", () => {
    const { container } = renderWithProviders(
      <CustomerFormSection icon={Mail} title="Default address">
        <input aria-label="City" />
      </CustomerFormSection>,
    )

    expect(container.querySelector("p")).toBeNull()
  })

  it("hides the decorative icon from assistive technology", () => {
    const { container } = renderWithProviders(
      <CustomerFormSection icon={Mail} title="Contact details">
        <input aria-label="Phone" />
      </CustomerFormSection>,
    )

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })
})
