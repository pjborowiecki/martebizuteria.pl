import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { DefaultPendingComponent } from "~/src/presentation/components/custom/defaults/default-pending-component"

const POLISH_LOADING = "Ładowanie…"

afterEach(() => {
  cleanup()
})

describe("DefaultPendingComponent on the storefront", () => {
  it("announces a full-page loading state in the request locale", () => {
    renderWithProviders(<DefaultPendingComponent />, { router: createTestRouter("/") })

    const placeholder = screen.getByLabelText(POLISH_LOADING)

    expect(placeholder).toHaveAttribute("aria-busy", "true")
    expect(placeholder.className).toContain("min-h-svh")
  })

  it("keeps the full-page placeholder on a deep storefront route", () => {
    renderWithProviders(<DefaultPendingComponent />, { router: createTestRouter("/products/linen-shirt") })

    expect(screen.getByLabelText(POLISH_LOADING)).toBeInTheDocument()
  })
})

describe("DefaultPendingComponent inside the admin shell", () => {
  it("stays silent so the admin layout does not jump", () => {
    const { container } = renderWithProviders(<DefaultPendingComponent />, { router: createTestRouter("/admin/customers") })

    expect(screen.queryByLabelText(POLISH_LOADING)).not.toBeInTheDocument()
    expect(container.firstElementChild).toHaveAttribute("aria-hidden")
  })

  it("recognises the admin shell behind a locale prefix", () => {
    const { container } = renderWithProviders(<DefaultPendingComponent />, { router: createTestRouter("/en-US/admin/orders") })

    expect(container.firstElementChild?.className).toBe("min-h-0")
  })
})
