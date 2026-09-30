import { cleanup, screen } from "@testing-library/react"
import { Boxes } from "lucide-react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AttributeFormSection } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-section"

describe("AttributeFormSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("heads the section with the title and renders its fields", () => {
    renderWithProviders(
      <AttributeFormSection icon={Boxes} title="Basic details">
        <label htmlFor="handle">URL Slug</label>
      </AttributeFormSection>,
    )

    expect(screen.getByRole("heading", { level: 3, name: "Basic details" })).toBeInTheDocument()
    expect(screen.getByText("URL Slug")).toBeInTheDocument()
  })

  it("shows the description when one is given", () => {
    renderWithProviders(
      <AttributeFormSection description="Reusable specification field." icon={Boxes} title="Basic details">
        <div />
      </AttributeFormSection>,
    )

    expect(screen.getByText("Reusable specification field.")).toBeInTheDocument()
  })

  it("renders no description paragraph when none is given", () => {
    const { container } = renderWithProviders(
      <AttributeFormSection icon={Boxes} title="Basic details">
        <div />
      </AttributeFormSection>,
    )

    expect(container.querySelector("p")).toBeNull()
  })

  it("hides the decorative icon from assistive technology", () => {
    const { container } = renderWithProviders(
      <AttributeFormSection icon={Boxes} title="Basic details">
        <div />
      </AttributeFormSection>,
    )

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })
})
