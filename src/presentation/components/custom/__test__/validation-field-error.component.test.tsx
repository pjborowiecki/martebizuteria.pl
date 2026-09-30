import { screen } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const NAMESPACE = "pages.auth.validations"

describe("ValidationFieldError", () => {
  it("renders nothing when there is no message", () => {
    const { container } = renderWithProviders(<ValidationFieldError namespace={NAMESPACE} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders nothing for an empty message", () => {
    const { container } = renderWithProviders(<ValidationFieldError message="" namespace={NAMESPACE} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("translates a known validation key", () => {
    renderWithProviders(<ValidationFieldError message="invalidEmail" namespace={NAMESPACE} />)

    expect(screen.getByText("Please enter a valid email address.")).toBeInTheDocument()
  })

  it("interpolates the params a key declares", () => {
    renderWithProviders(<ValidationFieldError message="passwordMinLength" namespace={NAMESPACE} params={AUTH_VALIDATION_PARAMS} />)

    expect(screen.getByText("At least 8 characters long")).toBeInTheDocument()
  })

  it("falls back to the generic validation error for an unknown key", () => {
    renderWithProviders(<ValidationFieldError message="notARealKey" namespace={NAMESPACE} />)

    expect(screen.getByText("Please check the form and try again.")).toBeInTheDocument()
  })
})
