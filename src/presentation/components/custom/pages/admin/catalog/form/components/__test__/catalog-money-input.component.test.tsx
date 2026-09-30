import { type JSX, useState } from "react"

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, renderWithProviders } from "~/src/platform/testing/lib/render"

import { CatalogMoneyInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-money-input"

const LABEL = "Price"

const ControlledMoneyInput = ({
  initial,
}: Readonly<{
  initial: string
}>): JSX.Element => {
  const [value, setValue] = useState(initial)

  return <CatalogMoneyInput aria-label={LABEL} onValueChange={setValue} value={value} />
}

describe("CatalogMoneyInput", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows a locale formatted example as placeholder", () => {
    renderWithProviders(<CatalogMoneyInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value="" />)

    expect(screen.getByLabelText(LABEL)).toHaveAttribute("placeholder", "199.00")
  })

  it("pads the stored value to the currency minor unit exponent", () => {
    renderWithProviders(<CatalogMoneyInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value="12.5" />)

    expect(screen.getByLabelText(LABEL)).toHaveValue("12.50")
  })

  it("leaves an empty stored value empty", () => {
    renderWithProviders(<CatalogMoneyInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value="" />)

    expect(screen.getByLabelText(LABEL)).toHaveValue("")
  })

  it("accepts a partially typed amount", () => {
    const onValueChange = vi.fn(() => {})
    renderWithProviders(<CatalogMoneyInput aria-label={LABEL} onValueChange={onValueChange} value="" />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "12." } })

    expect(onValueChange).toHaveBeenCalledWith("12.")
    expect(input).toHaveValue("12.")
  })

  it("rejects more decimals than the currency allows", () => {
    const onValueChange = vi.fn(() => {})
    renderWithProviders(<CatalogMoneyInput aria-label={LABEL} onValueChange={onValueChange} value="12.50" />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "12.501" } })

    expect(onValueChange).not.toHaveBeenCalled()
    expect(input).toHaveValue("12.50")
  })

  it("rejects letters", () => {
    const onValueChange = vi.fn(() => {})
    renderWithProviders(<CatalogMoneyInput aria-label={LABEL} onValueChange={onValueChange} value="" />)

    fireEvent.change(screen.getByLabelText(LABEL), { target: { value: "abc" } })

    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("reports an empty value when the field is cleared and blurred", () => {
    const onValueChange = vi.fn(() => {})
    renderWithProviders(<CatalogMoneyInput aria-label={LABEL} onValueChange={onValueChange} value="12.50" />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "" } })
    fireEvent.blur(input)

    expect(onValueChange).toHaveBeenLastCalledWith("")
  })

  it("normalises a complete amount on blur", () => {
    renderWithProviders(<ControlledMoneyInput initial="" />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "8.5" } })
    fireEvent.blur(input)

    expect(input).toHaveValue("8.50")
  })

  it("restores the stored value when the draft cannot be parsed", () => {
    const onValueChange = vi.fn(() => {})
    renderWithProviders(<CatalogMoneyInput aria-label={LABEL} onValueChange={onValueChange} value="7.25" />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "12." } })
    fireEvent.blur(input)

    expect(onValueChange).toHaveBeenLastCalledWith("7.25")
    expect(input).toHaveValue("7.25")
  })

  it("blocks exponent and sign keys but allows the decimal separator", () => {
    renderWithProviders(<CatalogMoneyInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value="" />)

    const input = screen.getByLabelText(LABEL)

    for (const key of ["e", "E", "+", "-"]) {
      expect(fireEvent.keyDown(input, { key })).toBe(false)
    }
    expect(fireEvent.keyDown(input, { key: "." })).toBe(true)
    expect(fireEvent.keyDown(input, { key: "3" })).toBe(true)
  })

  it("marks the control invalid when asked", () => {
    renderWithProviders(<CatalogMoneyInput ariaInvalid aria-label={LABEL} onValueChange={vi.fn(() => {})} value="" />)

    expect(screen.getByLabelText(LABEL)).toHaveAttribute("aria-invalid", "true")
  })

  it("re-formats the display when a new stored value arrives", () => {
    const { queryClient, rerender, router } = renderWithProviders(
      <CatalogMoneyInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value="1" />,
    )

    rerender(
      <TestProviders queryClient={queryClient} router={router}>
        <CatalogMoneyInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value="3.4" />
      </TestProviders>,
    )

    expect(screen.getByLabelText(LABEL)).toHaveValue("3.40")
  })
})
