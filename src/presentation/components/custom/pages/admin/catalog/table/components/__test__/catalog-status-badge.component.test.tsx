import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CatalogStatusBadge } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/catalog-status-badge"

describe("CatalogStatusBadge", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the label it was handed", () => {
    renderWithProviders(<CatalogStatusBadge isActive label="Active" />)

    expect(screen.getByText("Active")).toBeInTheDocument()
  })

  it("tints an active row emerald", () => {
    renderWithProviders(<CatalogStatusBadge isActive label="Active" />)

    expect(screen.getByText("Active").className).toContain("text-emerald-600")
  })

  it("tints a draft row amber", () => {
    renderWithProviders(<CatalogStatusBadge isActive={false} label="Draft" />)

    expect(screen.getByText("Draft").className).toContain("text-amber-600")
  })

  it("never mixes the two tints on one badge", () => {
    renderWithProviders(<CatalogStatusBadge isActive={false} label="Draft" />)

    expect(screen.getByText("Draft").className).not.toContain("emerald")
  })
})
