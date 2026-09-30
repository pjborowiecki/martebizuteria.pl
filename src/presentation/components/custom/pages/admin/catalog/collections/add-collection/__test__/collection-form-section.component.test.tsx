import { cleanup, screen } from "@testing-library/react"
import { Layers } from "lucide-react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CollectionFormSection } from "../collection-form-section"

describe("CollectionFormSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the title as a heading with its icon", () => {
    const { container } = renderWithProviders(
      <CollectionFormSection icon={Layers} title="Basics">
        <input aria-label="Handle" />
      </CollectionFormSection>,
    )

    expect(screen.getByRole("heading", { level: 3, name: "Basics" })).toBeInTheDocument()
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("renders the fields it wraps", () => {
    renderWithProviders(
      <CollectionFormSection icon={Layers} title="Basics">
        <input aria-label="Handle" />
      </CollectionFormSection>,
    )

    expect(screen.getByLabelText("Handle")).toBeInTheDocument()
  })

  it("omits the description paragraph when none is given", () => {
    const { container } = renderWithProviders(
      <CollectionFormSection icon={Layers} title="Basics">
        <span>fields</span>
      </CollectionFormSection>,
    )

    expect(container.querySelector("p")).toBeNull()
  })

  it("renders the description when one is given", () => {
    renderWithProviders(
      <CollectionFormSection description="How shoppers find this collection" icon={Layers} title="Basics">
        <span>fields</span>
      </CollectionFormSection>,
    )

    expect(screen.getByText("How shoppers find this collection")).toBeInTheDocument()
  })
})
