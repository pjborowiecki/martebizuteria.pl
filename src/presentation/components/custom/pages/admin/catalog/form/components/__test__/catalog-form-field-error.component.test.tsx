import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CatalogFormFieldError } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-field-error"

describe("CatalogFormFieldError", () => {
  afterEach(() => {
    cleanup()
  })

  it("renders nothing when the field has no error", () => {
    const { container } = renderWithProviders(<CatalogFormFieldError fieldState={{ invalid: false }} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing for an empty error message", () => {
    const { container } = renderWithProviders(<CatalogFormFieldError fieldState={{ error: { message: "", type: "min" }, invalid: true }} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders the raw message when no translator is supplied", () => {
    renderWithProviders(<CatalogFormFieldError fieldState={{ error: { message: "titleRequired", type: "required" }, invalid: true }} />)

    expect(screen.getByText("titleRequired")).toBeInTheDocument()
  })

  it("translates a message the validation key set knows", () => {
    const translate = vi.fn((key: string) => `translated:${key}`)

    renderWithProviders(
      <CatalogFormFieldError
        fieldState={{ error: { message: "titleRequired", type: "required" }, invalid: true }}
        translate={translate}
        validationKeySet={new Set(["titleRequired"])}
      />,
    )

    expect(screen.getByText("translated:titleRequired")).toBeInTheDocument()
    expect(translate).toHaveBeenCalledWith("titleRequired")
  })

  it("keeps the raw message when the key set does not know it", () => {
    const translate = vi.fn((key: string) => `translated:${key}`)

    renderWithProviders(
      <CatalogFormFieldError
        fieldState={{ error: { message: "somethingElse", type: "required" }, invalid: true }}
        translate={translate}
        validationKeySet={new Set(["titleRequired"])}
      />,
    )

    expect(screen.getByText("somethingElse")).toBeInTheDocument()
    expect(translate).not.toHaveBeenCalled()
  })

  it("keeps the raw message when a key set is given without a translator", () => {
    renderWithProviders(
      <CatalogFormFieldError
        fieldState={{ error: { message: "titleRequired", type: "required" }, invalid: true }}
        validationKeySet={new Set(["titleRequired"])}
      />,
    )

    expect(screen.getByText("titleRequired")).toBeInTheDocument()
  })
})
