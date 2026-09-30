import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CatalogTitleHandleCell } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-title-handle-cell"

describe("CatalogTitleHandleCell", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the title above the handle", () => {
    renderWithProviders(<CatalogTitleHandleCell handle="silver-rings" title="Silver rings" />)

    expect(screen.getByText("Silver rings")).toBeInTheDocument()
    expect(screen.getByText("/silver-rings")).toBeInTheDocument()
  })

  it("does not double the leading slash of a handle that already carries one", () => {
    renderWithProviders(<CatalogTitleHandleCell handle="/silver-rings" title="Silver rings" />)

    expect(screen.getByText("/silver-rings")).toBeInTheDocument()
    expect(screen.queryByText("//silver-rings")).toBeNull()
  })

  it("still renders a slug line for an empty handle", () => {
    renderWithProviders(<CatalogTitleHandleCell handle="" title="Silver rings" />)

    expect(screen.getByText("/")).toBeInTheDocument()
  })

  it("keeps the handle in a monospaced muted line", () => {
    renderWithProviders(<CatalogTitleHandleCell handle="silver-rings" title="Silver rings" />)

    expect(screen.getByText("/silver-rings").className).toContain("font-mono")
    expect(screen.getByText("Silver rings").className).toContain("font-medium")
  })
})
