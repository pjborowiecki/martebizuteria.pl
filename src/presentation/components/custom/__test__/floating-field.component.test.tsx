import { cleanup, screen } from "@testing-library/react"
import { type ControllerFieldState } from "react-hook-form"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import {
  FLOATING_LABEL_CLASS,
  FloatingLabel,
  VALID_INPUT_CLASS,
  ValidCheck,
  isFieldValid,
  toStringValue,
} from "~/src/presentation/components/custom/floating-field"

afterEach(() => {
  cleanup()
})

const fieldState = (overrides: Partial<ControllerFieldState>): ControllerFieldState => ({
  invalid: false,
  isDirty: false,
  isTouched: false,
  isValidating: false,
  ...overrides,
})

describe("FloatingLabel", () => {
  it("labels the input it points at", () => {
    renderWithProviders(<FloatingLabel htmlFor="email" label="Email" />)

    expect(screen.getByText("Email")).toHaveAttribute("for", "email")
  })

  it("marks a required field with an asterisk", () => {
    renderWithProviders(<FloatingLabel htmlFor="email" label="Email" required />)

    expect(screen.getByText("Email").textContent).toBe("Email *")
  })

  it("adds no asterisk to an optional field", () => {
    renderWithProviders(<FloatingLabel htmlFor="company" label="Company" required={false} />)

    expect(screen.getByText("Company").textContent).toBe("Company")
  })

  it("keeps the shared floating behaviour when a caller adds its own class", () => {
    renderWithProviders(<FloatingLabel className="left-0" htmlFor="email" label="Email" />)
    const label = screen.getByText("Email")

    expect(label).toHaveClass("left-0")
    expect(label).toHaveClass("peer-focus:uppercase")
  })
})

describe("FLOATING_LABEL_CLASS", () => {
  it("floats the label on focus and once the input holds a value", () => {
    expect(FLOATING_LABEL_CLASS).toContain("peer-focus:top-0")
    expect(FLOATING_LABEL_CLASS).toContain("peer-[:not(:placeholder-shown)]:top-0")
  })

  it("turns destructive when the input is marked invalid", () => {
    expect(FLOATING_LABEL_CLASS).toContain("peer-aria-[invalid=true]:text-destructive")
  })

  it("never swallows pointer events meant for the input", () => {
    expect(FLOATING_LABEL_CLASS).toContain("pointer-events-none")
  })
})

describe("ValidCheck", () => {
  it("renders nothing while the field is not yet valid", () => {
    const { container } = renderWithProviders(<ValidCheck show={false} />)

    expect(container).toBeEmptyDOMElement()
  })

  it("renders a decorative success tick once the field is valid", () => {
    const { container } = renderWithProviders(<ValidCheck show />)
    const icon = container.querySelector("svg")

    expect(icon).toHaveAttribute("aria-hidden", "true")
    expect(icon).toHaveClass("text-success")
  })

  it("keeps its position classes when a caller adds its own", () => {
    const { container } = renderWithProviders(<ValidCheck className="right-8" show />)

    expect(container.querySelector("svg")).toHaveClass("right-8")
  })
})

describe("VALID_INPUT_CLASS", () => {
  it("greens the border both at rest and on focus", () => {
    expect(VALID_INPUT_CLASS.split(" ")).toStrictEqual(["border-success", "focus-visible:border-success"])
  })
})

describe("toStringValue", () => {
  it("passes a string through untouched", () => {
    expect(toStringValue("silver")).toBe("silver")
  })

  it.each([[undefined], [null], [0], [false], [{}], [[]]])("turns the non-string %j into an empty string", (value) => {
    expect(toStringValue(value)).toBe("")
  })
})

describe("isFieldValid", () => {
  it("is valid once a touched field holds a value and carries no error", () => {
    expect(isFieldValid(fieldState({ isTouched: true }), "silver")).toBe(true)
  })

  it("is not valid before the field is touched", () => {
    expect(isFieldValid(fieldState({}), "silver")).toBe(false)
  })

  it("is not valid while the field is invalid", () => {
    expect(isFieldValid(fieldState({ invalid: true, isTouched: true }), "silver")).toBe(false)
  })

  it("is not valid for an empty value, even after the field was touched", () => {
    expect(isFieldValid(fieldState({ isTouched: true }), "")).toBe(false)
  })
})
