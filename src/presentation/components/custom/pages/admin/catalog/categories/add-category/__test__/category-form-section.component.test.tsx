import { cleanup, screen } from "@testing-library/react"
import { FolderTree } from "lucide-react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CategoryFormSection } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-section"

describe("CategoryFormSection", () => {
  afterEach(() => {
    cleanup()
  })

  it("heads the section with the title and renders its fields", () => {
    renderWithProviders(
      <CategoryFormSection icon={FolderTree} title="Hierarchy">
        <label htmlFor="parentId">Parent category</label>
      </CategoryFormSection>,
    )

    expect(screen.getByRole("heading", { level: 3, name: "Hierarchy" })).toBeInTheDocument()
    expect(screen.getByText("Parent category")).toBeInTheDocument()
  })

  it("shows the description when one is given", () => {
    renderWithProviders(
      <CategoryFormSection description="Nest this category under another." icon={FolderTree} title="Hierarchy">
        <div />
      </CategoryFormSection>,
    )

    expect(screen.getByText("Nest this category under another.")).toBeInTheDocument()
  })

  it("renders no description paragraph when none is given", () => {
    const { container } = renderWithProviders(
      <CategoryFormSection icon={FolderTree} title="Hierarchy">
        <div />
      </CategoryFormSection>,
    )

    expect(container.querySelector("p")).toBeNull()
  })

  it("hides the decorative icon from assistive technology", () => {
    const { container } = renderWithProviders(
      <CategoryFormSection icon={FolderTree} title="Hierarchy">
        <div />
      </CategoryFormSection>,
    )

    expect(container.querySelector("svg")).toHaveAttribute("aria-hidden", "true")
  })
})
