import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { PRODUCT_STATUS } from "~/src/modules/product/product.constants"

import { ProductStatusBadge } from "~/src/presentation/components/custom/pages/admin/catalog/table/components/product-status-badge"

describe("ProductStatusBadge", () => {
  afterEach(() => {
    cleanup()
  })

  it("tints a published product emerald and drops the ring", () => {
    renderWithProviders(<ProductStatusBadge label="Published" status={PRODUCT_STATUS.PUBLISHED} />)
    const badge = screen.getByText("Published")

    expect(badge.className).toContain("text-emerald-600")
    expect(badge.className).toContain("ring-0")
  })

  it("tints a draft product amber and keeps the ring off", () => {
    renderWithProviders(<ProductStatusBadge label="Draft" status={PRODUCT_STATUS.DRAFT} />)
    const badge = screen.getByText("Draft")

    expect(badge.className).toContain("text-amber-600")
    expect(badge.className).not.toContain("ring-0")
  })

  it("greys an archived product out", () => {
    renderWithProviders(<ProductStatusBadge label="Archived" status={PRODUCT_STATUS.ARCHIVED} />)
    const badge = screen.getByText("Archived")

    expect(badge.className).toContain("text-muted-foreground")
    expect(badge.className).not.toContain("emerald")
  })

  it("shows the translated label rather than the raw status", () => {
    renderWithProviders(<ProductStatusBadge label="Opublikowany" status={PRODUCT_STATUS.PUBLISHED} />)

    expect(screen.getByText("Opublikowany")).toBeInTheDocument()
    expect(screen.queryByText(PRODUCT_STATUS.PUBLISHED)).toBeNull()
  })
})
