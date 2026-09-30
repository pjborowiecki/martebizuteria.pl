import { type JSX, useState } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { QuantityPicker } from "~/src/presentation/components/custom/pages/product-page/quantity-picker"

const Harness = ({ initialQuantity, maxQuantity }: Readonly<{ initialQuantity: number; maxQuantity?: number }>): JSX.Element => {
  const [quantity, setQuantity] = useState(initialQuantity)

  return <QuantityPicker {...(maxQuantity === undefined ? {} : { maxQuantity })} quantity={quantity} setQuantity={setQuantity} />
}

const renderPicker = (initialQuantity: number, maxQuantity?: number) => {
  renderWithProviders(<Harness initialQuantity={initialQuantity} {...(maxQuantity === undefined ? {} : { maxQuantity })} />)

  return {
    decrease: screen.getByRole("button", { name: "Decrease quantity" }),
    increase: screen.getByRole("button", { name: "Increase quantity" }),
  }
}

describe("QuantityPicker", () => {
  afterEach(() => {
    cleanup()
  })

  it("labels the control with the translated quantity heading", () => {
    renderPicker(1)

    expect(screen.getByText("Quantity")).toBeInTheDocument()
  })

  it("shows the current quantity", () => {
    renderPicker(3)

    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("adds one on increase", async () => {
    const { increase } = renderPicker(2)

    await userEvent.click(increase)

    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("removes one on decrease", async () => {
    const { decrease } = renderPicker(2)

    await userEvent.click(decrease)

    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("never drops below one", async () => {
    const { decrease } = renderPicker(1)

    await userEvent.click(decrease)

    expect(screen.getByText("1")).toBeInTheDocument()
  })

  it("grows without limit when no maximum is given", async () => {
    const { increase } = renderPicker(1)

    await userEvent.click(increase)
    await userEvent.click(increase)

    expect(screen.getByText("3")).toBeInTheDocument()
  })

  it("stops at the available stock", async () => {
    const { increase } = renderPicker(1, 2)

    await userEvent.click(increase)

    expect(screen.getByText("2")).toBeInTheDocument()
    expect(increase).toBeDisabled()
  })

  it("disables the increase button once the quantity already reaches the maximum", () => {
    const { decrease, increase } = renderPicker(2, 2)

    expect(increase).toBeDisabled()
    expect(decrease).toBeEnabled()
  })

  it("re-enables the increase button after stepping back below the maximum", async () => {
    const { decrease, increase } = renderPicker(2, 2)

    await userEvent.click(decrease)

    expect(increase).toBeEnabled()
  })
})
