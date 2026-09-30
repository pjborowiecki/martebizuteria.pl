import { cleanup, fireEvent, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CatalogIntegerFilterInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-integer-filter-input"

const LABEL = "Minimum stock"

describe("CatalogIntegerFilterInput", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the value it is given", () => {
    renderWithProviders(<CatalogIntegerFilterInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value="42" />)

    expect(screen.getByLabelText(LABEL)).toHaveValue("42")
  })

  it("defaults the placeholder to zero", () => {
    renderWithProviders(<CatalogIntegerFilterInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value="" />)

    expect(screen.getByLabelText(LABEL)).toHaveAttribute("placeholder", "0")
  })

  it("uses an explicit placeholder when given", () => {
    renderWithProviders(<CatalogIntegerFilterInput aria-label={LABEL} onValueChange={vi.fn(() => {})} placeholder="min" value="" />)

    expect(screen.getByLabelText(LABEL)).toHaveAttribute("placeholder", "min")
  })

  it("strips non digits before reporting the change", () => {
    const onValueChange = vi.fn(() => {})
    renderWithProviders(<CatalogIntegerFilterInput aria-label={LABEL} onValueChange={onValueChange} value="" />)

    fireEvent.change(screen.getByLabelText(LABEL), { target: { value: "1a2.3-" } })

    expect(onValueChange).toHaveBeenCalledWith("123")
  })

  it("reports an empty string when every character is stripped", () => {
    const onValueChange = vi.fn(() => {})
    renderWithProviders(<CatalogIntegerFilterInput aria-label={LABEL} onValueChange={onValueChange} value="7" />)

    fireEvent.change(screen.getByLabelText(LABEL), { target: { value: "abc" } })

    expect(onValueChange).toHaveBeenCalledWith("")
  })

  it("blocks exponent and sign keys", () => {
    renderWithProviders(<CatalogIntegerFilterInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value="" />)

    const input = screen.getByLabelText(LABEL)

    for (const key of ["e", "E", "+", "-", ".", ","]) {
      expect(fireEvent.keyDown(input, { key })).toBe(false)
    }
  })

  it("allows digit keys through", () => {
    renderWithProviders(<CatalogIntegerFilterInput aria-label={LABEL} onValueChange={vi.fn(() => {})} value="" />)

    expect(fireEvent.keyDown(screen.getByLabelText(LABEL), { key: "5" })).toBe(true)
  })
})
