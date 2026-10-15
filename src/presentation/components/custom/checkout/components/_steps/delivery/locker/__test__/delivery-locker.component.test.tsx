import { type JSX, useEffect } from "react"

import { cleanup, screen } from "@testing-library/react"
import { type Control, useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { DeliveryLocker } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/delivery-locker"

interface LockerForm {
  lockerId: string
}

const form = vi.hoisted((): { control?: Control<LockerForm> } => ({}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", () => ({
  useCheckoutForm: () => ({ control: form.control }),
}))

vi.mock("~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-selector", () => ({
  InpostSelector: () => <div data-testid="inpost-selector" />,
}))

const LockerHarness = ({ errorMessage, lockerId }: Readonly<{ errorMessage?: string | undefined; lockerId: string }>): JSX.Element => {
  const { control, setError } = useForm<LockerForm>({ defaultValues: { lockerId } })
  form.control = control

  useEffect(() => {
    if (errorMessage !== undefined) {
      setError("lockerId", { message: errorMessage, type: "custom" })
    }
  }, [errorMessage, setError])

  return <DeliveryLocker />
}

describe("DeliveryLocker", () => {
  afterEach(cleanup)

  it("explains the parcel locker option", () => {
    renderWithProviders(<LockerHarness lockerId="" />)

    expect(screen.getByText("InPost Parcel Lockers")).toBeInTheDocument()
    expect(screen.getByText("Have your package delivered to a secure parcel locker (e.g. InPost Paczkomat).")).toBeInTheDocument()
  })

  it("states the delivery time the terms of service give: the fulfillment time, then up to 4 business days with InPost", () => {
    renderWithProviders(<LockerHarness lockerId="" />)

    expect(
      screen.getByText(
        "We prepare your order within the fulfillment time stated on the product page, counted from the acceptance of the order; with several products, the longest applies. InPost delivery then takes up to 4 business days from dispatch, and we email you the tracking number.",
      ),
    ).toBeInTheDocument()
  })

  it("always renders the locker picker", () => {
    renderWithProviders(<LockerHarness lockerId="" />)

    expect(screen.getByTestId("inpost-selector")).toBeInTheDocument()
  })

  it("pads the locker card less on phones", () => {
    renderWithProviders(<LockerHarness lockerId="" />)

    expect(screen.getByTestId("inpost-selector").closest(".border")).toHaveClass("p-4", "sm:p-6")
  })

  it("hides the summary while no locker is chosen", () => {
    renderWithProviders(<LockerHarness lockerId="" />)

    expect(screen.queryByText("Selected Parcel Locker:")).not.toBeInTheDocument()
  })

  it("summarises the chosen locker id", () => {
    renderWithProviders(<LockerHarness lockerId="WAW123A" />)

    expect(screen.getByText("Selected Parcel Locker:")).toBeInTheDocument()
    expect(screen.getByText("WAW123A")).toBeInTheDocument()
  })

  it("leaves the field valid until an error is set", () => {
    const { container } = renderWithProviders(<LockerHarness lockerId="WAW123A" />)

    expect(container.querySelector("[data-invalid='true']")).toBeNull()
  })

  it("translates the validation message of an invalid field", async () => {
    const { container } = renderWithProviders(<LockerHarness errorMessage="validation.lockerIdRequired" lockerId="" />)

    expect(await screen.findByText("Please select a parcel locker")).toBeInTheDocument()
    expect(container.querySelector("[data-invalid='true']")).not.toBeNull()
  })
})
