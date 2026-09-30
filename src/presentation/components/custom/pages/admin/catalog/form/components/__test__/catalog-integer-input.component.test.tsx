import { type JSX, useState } from "react"

import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, renderWithProviders } from "~/src/platform/testing/lib/render"

import { CatalogIntegerInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-integer-input"

const LABEL = "Stock"

const ControlledIntegerInput = ({
  initial,
  min,
}: Readonly<{
  initial: number
  min: number
}>): JSX.Element => {
  const [value, setValue] = useState(initial)

  return <CatalogIntegerInput aria-label={LABEL} min={min} onValueChange={setValue} value={value} />
}

describe("CatalogIntegerInput", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the numeric value as text", () => {
    renderWithProviders(<CatalogIntegerInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value={7} />)

    expect(screen.getByLabelText(LABEL)).toHaveValue("7")
  })

  it("strips non digits while typing without committing", () => {
    const onValueChange = vi.fn(() => {})
    renderWithProviders(<CatalogIntegerInput aria-label={LABEL} onValueChange={onValueChange} value={0} />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "1x2" } })

    expect(input).toHaveValue("12")
    expect(onValueChange).not.toHaveBeenCalled()
  })

  it("commits the typed integer on blur", () => {
    const onValueChange = vi.fn(() => {})
    renderWithProviders(<CatalogIntegerInput aria-label={LABEL} onValueChange={onValueChange} value={0} />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "25" } })
    fireEvent.blur(input)

    expect(onValueChange).toHaveBeenCalledWith(25)
  })

  it("shows the committed value once the owner accepts it", () => {
    renderWithProviders(<ControlledIntegerInput initial={0} min={0} />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "25" } })
    fireEvent.blur(input)

    expect(input).toHaveValue("25")
  })

  it("resets the draft to the owner value when the commit is ignored", () => {
    renderWithProviders(<CatalogIntegerInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value={4} />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "88" } })
    fireEvent.blur(input)

    expect(input).toHaveValue("4")
  })

  it("falls back to the minimum when the field is cleared", () => {
    renderWithProviders(<ControlledIntegerInput initial={4} min={1} />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "" } })
    fireEvent.blur(input)

    expect(input).toHaveValue("1")
  })

  it("clamps a value below the minimum", () => {
    renderWithProviders(<ControlledIntegerInput initial={10} min={10} />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "3" } })
    fireEvent.blur(input)

    expect(input).toHaveValue("10")
  })

  it("recovers a nonnumeric initial value to the configured minimum on blur", () => {
    renderWithProviders(<ControlledIntegerInput initial={Number.NaN} min={3} />)
    const input = screen.getByLabelText(LABEL)

    fireEvent.focus(input)
    fireEvent.blur(input)

    expect(input).toHaveValue("3")
  })

  it("defaults the minimum to zero", () => {
    const onValueChange = vi.fn(() => {})
    renderWithProviders(<CatalogIntegerInput aria-label={LABEL} onValueChange={onValueChange} value={5} />)

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "" } })
    fireEvent.blur(input)

    expect(onValueChange).toHaveBeenCalledWith(0)
  })

  it("adopts a new value prop while it is not being edited", () => {
    const { queryClient, rerender, router } = renderWithProviders(
      <CatalogIntegerInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value={2} />,
    )

    rerender(
      <TestProviders queryClient={queryClient} router={router}>
        <CatalogIntegerInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value={9} />
      </TestProviders>,
    )

    expect(screen.getByLabelText(LABEL)).toHaveValue("9")
  })

  it("keeps the typed draft when the value prop changes mid edit", () => {
    const { queryClient, rerender, router } = renderWithProviders(
      <CatalogIntegerInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value={2} />,
    )

    const input = screen.getByLabelText(LABEL)
    fireEvent.focus(input)
    fireEvent.change(input, { target: { value: "33" } })
    rerender(
      <TestProviders queryClient={queryClient} router={router}>
        <CatalogIntegerInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value={9} />
      </TestProviders>,
    )

    expect(input).toHaveValue("33")
  })

  it("blocks exponent, sign and separator keys", () => {
    renderWithProviders(<CatalogIntegerInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value={0} />)

    const input = screen.getByLabelText(LABEL)

    for (const key of ["e", "E", "+", "-", ".", ","]) {
      expect(fireEvent.keyDown(input, { key })).toBe(false)
    }
    expect(fireEvent.keyDown(input, { key: "8" })).toBe(true)
  })

  it("marks the control invalid when asked", () => {
    renderWithProviders(<CatalogIntegerInput aria-label={LABEL} ariaInvalid onValueChange={vi.fn(() => {})} value={0} />)

    expect(screen.getByLabelText(LABEL)).toHaveAttribute("aria-invalid", "true")
  })
})
