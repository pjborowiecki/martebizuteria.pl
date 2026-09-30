import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CatalogFormFieldLabel } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-label"

describe("CatalogFormFieldLabel", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders the label text", () => {
    renderWithProviders(<CatalogFormFieldLabel label="Handle" />)

    expect(screen.getByText("Handle")).toBeInTheDocument()
  })

  it("omits the hint trigger when no hint is given", () => {
    renderWithProviders(<CatalogFormFieldLabel label="Handle" required />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })

  it("exposes the hint on the trigger when it is not required", () => {
    renderWithProviders(<CatalogFormFieldLabel hint="Used in the storefront URL." label="Handle" />)

    expect(screen.getByRole("button", { name: "Used in the storefront URL." })).toBeInTheDocument()
  })

  it("appends the translated required suffix to the hint", () => {
    renderWithProviders(<CatalogFormFieldLabel hint="Used in the storefront URL." label="Handle" required />)

    expect(screen.getByRole("button", { name: "Used in the storefront URL. Required field." })).toBeInTheDocument()
  })

  it("does not append the required suffix twice", () => {
    renderWithProviders(<CatalogFormFieldLabel hint="Required field." label="Handle" required />)

    expect(screen.getByRole("button", { name: "Required field." })).toBeInTheDocument()
  })

  it("omits the counter slot when no counter is given", () => {
    renderWithProviders(<CatalogFormFieldLabel label="Handle" />)

    expect(screen.queryByText("12 / 80")).not.toBeInTheDocument()
  })

  it("renders the counter alongside the label", () => {
    renderWithProviders(<CatalogFormFieldLabel counter="12 / 80" label="Handle" />)

    expect(screen.getByText("12 / 80")).toBeInTheDocument()
    expect(screen.getByText("Handle")).toBeInTheDocument()
  })
})
