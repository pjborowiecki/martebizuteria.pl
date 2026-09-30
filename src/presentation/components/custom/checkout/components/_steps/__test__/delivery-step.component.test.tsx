import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { type UseFormReturn, useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

interface DeliveryMethodRow {
  readonly id: string
  readonly name: string
  readonly price: number
  readonly type: string
}

const { checkoutForm, methodsState } = vi.hoisted(() => ({
  checkoutForm: { isPending: false, onNext: vi.fn<(stepId: string, event?: unknown) => Promise<void>>() },
  methodsState: { pending: false, rows: [] as { id: string; name: string; price: number; type: string }[] },
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", () => ({
  useCheckoutForm: () => checkoutForm,
}))
vi.mock("~/src/modules/delivery-method/use-cases/list-delivery-methods", () => ({
  listDeliveryMethodsQuery: () => ({
    queryFn: () => (methodsState.pending ? new Promise(() => {}) : Promise.resolve(methodsState.rows)),
    queryKey: ["deliveryMethods", methodsState.pending],
  }),
}))
vi.mock("~/src/presentation/components/custom/checkout/components/_steps/delivery/courier/delivery-courier", () => ({
  DeliveryCourier: () => <p>courier substep</p>,
}))
vi.mock("~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/delivery-locker", () => ({
  DeliveryLocker: () => <p>locker substep</p>,
}))
vi.mock("~/src/presentation/components/custom/checkout/components/_steps/delivery/store/delivery-in-store", () => ({
  DeliveryInStore: () => <p>in-store substep</p>,
}))

const { DeliveryStep } = await import("~/src/presentation/components/custom/checkout/components/_steps/delivery-step")
const { CHECKOUT_STEP_ID } = await import("~/src/presentation/components/custom/checkout/lib/checkout-steps")

const method = (overrides: Partial<DeliveryMethodRow> = {}): DeliveryMethodRow => ({
  id: "dm-courier-dpd",
  name: "DPD Courier",
  price: 1999,
  type: "courier",
  ...overrides,
})

const observed: { form?: UseFormReturn<CheckoutFormSchema> } = {}

const DeliveryStepHarness = ({ deliveryMethodType = "" }: Readonly<{ deliveryMethodType?: string }>): JSX.Element => {
  const form = useForm<CheckoutFormSchema>({ defaultValues: { deliveryMethod: "", deliveryMethodType } })
  observed.form = form
  Object.assign(checkoutForm, {
    control: form.control,
    isPending: checkoutForm.isPending,
    onNext: checkoutForm.onNext,
    setValue: form.setValue,
  })

  return <DeliveryStep />
}

const UnsetDeliveryStepHarness = (): JSX.Element => {
  const form = useForm<CheckoutFormSchema>({ defaultValues: { deliveryMethod: "" } })
  observed.form = form
  Object.assign(checkoutForm, {
    control: form.control,
    isPending: checkoutForm.isPending,
    onNext: checkoutForm.onNext,
    setValue: form.setValue,
  })

  return <DeliveryStep />
}

beforeEach(() => {
  checkoutForm.onNext.mockReset()
  checkoutForm.onNext.mockResolvedValue()
  checkoutForm.isPending = false
  methodsState.pending = false
  methodsState.rows = [method()]
  delete observed.form
})

afterEach(() => {
  cleanup()
})

describe("DeliveryStep options", () => {
  it("shows a placeholder card per delivery family while the methods load", () => {
    methodsState.pending = true

    const { container } = renderWithProviders(<DeliveryStepHarness />)

    expect(container.querySelectorAll('[data-slot="skeleton"]')).toHaveLength(12)
    expect(screen.queryByRole("radio")).not.toBeInTheDocument()
  })

  it("offers one translated option per delivery family that has methods", async () => {
    methodsState.rows = [
      method(),
      method({ id: "dm-locker", price: 1299, type: "locker" }),
      method({ id: "dm-store", price: 0, type: "in_store" }),
    ]

    renderWithProviders(<DeliveryStepHarness />)

    expect(await screen.findByRole("radio", { name: /Courier/u })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /Parcel Locker/u })).toBeInTheDocument()
    expect(screen.getByRole("radio", { name: /In-Store Pickup/u })).toBeInTheDocument()
  })

  it("leaves out a delivery family nothing is configured for", async () => {
    renderWithProviders(<DeliveryStepHarness />)

    expect(await screen.findByRole("radio", { name: /Courier/u })).toBeInTheDocument()
    expect(screen.queryByRole("radio", { name: /Parcel Locker/u })).not.toBeInTheDocument()
    expect(screen.queryByRole("radio", { name: /In-Store Pickup/u })).not.toBeInTheDocument()
  })

  it("prices a family that holds a single method with that price", async () => {
    renderWithProviders(<DeliveryStepHarness />)

    expect(await screen.findByText("PLN 19.99")).toBeInTheDocument()
  })

  it("prices several couriers from the cheapest one", async () => {
    methodsState.rows = [method(), method({ id: "dm-courier-inpost", price: 1499 }), method({ id: "dm-courier-dhl", price: 2499 })]

    renderWithProviders(<DeliveryStepHarness />)

    expect(await screen.findByText("From PLN 14.99")).toBeInTheDocument()
  })

  it("announces a free method instead of a zero price", async () => {
    methodsState.rows = [method({ price: 0 })]

    renderWithProviders(<DeliveryStepHarness />)

    expect(await screen.findByText("Free")).toBeInTheDocument()
  })

  it("prices several lockers from the cheapest one, whatever order the server sent them in", async () => {
    methodsState.rows = [
      method({ id: "dm-locker-a", price: 1299, type: "locker" }),
      method({ id: "dm-locker-b", price: 999, type: "locker" }),
    ]

    renderWithProviders(<DeliveryStepHarness />)

    expect(await screen.findByText("From PLN 9.99")).toBeInTheDocument()
    expect(screen.queryByText("PLN 12.99")).not.toBeInTheDocument()
  })

  it("announces a free family when its cheapest method costs nothing", async () => {
    methodsState.rows = [
      method({ id: "dm-locker-paid", price: 1299, type: "locker" }),
      method({ id: "dm-locker-free", price: 0, type: "locker" }),
    ]

    renderWithProviders(<DeliveryStepHarness />)

    expect(await screen.findByText("Free")).toBeInTheDocument()
  })
})

describe("DeliveryStep selection", () => {
  it("selects the only method of the family the shopper picks", async () => {
    renderWithProviders(<DeliveryStepHarness />)

    await userEvent.click(await screen.findByRole("radio", { name: /Courier/u }))

    expect(observed.form?.getValues("deliveryMethodType")).toBe("courier")
    expect(observed.form?.getValues("deliveryMethod")).toBe("dm-courier-dpd")
  })

  it("waits for a choice when the family holds several methods", async () => {
    methodsState.rows = [method(), method({ id: "dm-courier-inpost", price: 1499 })]
    renderWithProviders(<DeliveryStepHarness />)

    await userEvent.click(await screen.findByRole("radio", { name: /Courier/u }))

    expect(observed.form?.getValues("deliveryMethodType")).toBe("courier")
    expect(observed.form?.getValues("deliveryMethod")).toBe("")
  })

  it("clears a method chosen earlier when the shopper switches family", async () => {
    methodsState.rows = [
      method(),
      method({ id: "dm-locker-a", price: 1299, type: "locker" }),
      method({ id: "dm-locker-b", price: 999, type: "locker" }),
    ]
    renderWithProviders(<DeliveryStepHarness />)
    await userEvent.click(await screen.findByRole("radio", { name: /Courier/u }))

    await userEvent.click(screen.getByRole("radio", { name: /Parcel Locker/u }))

    expect(observed.form?.getValues("deliveryMethodType")).toBe("locker")
    expect(observed.form?.getValues("deliveryMethod")).toBe("")
  })
})

describe("DeliveryStep substep", () => {
  it("shows no substep until a family is chosen", () => {
    renderWithProviders(<DeliveryStepHarness deliveryMethodType="" />)

    expect(screen.queryByText("courier substep")).not.toBeInTheDocument()
    expect(screen.queryByText("locker substep")).not.toBeInTheDocument()
    expect(screen.queryByText("in-store substep")).not.toBeInTheDocument()
  })

  it("shows the courier substep for a courier delivery", () => {
    renderWithProviders(<DeliveryStepHarness deliveryMethodType="courier" />)

    expect(screen.getByText("courier substep")).toBeInTheDocument()
  })

  it("shows the locker substep for a locker delivery", () => {
    renderWithProviders(<DeliveryStepHarness deliveryMethodType="locker" />)

    expect(screen.getByText("locker substep")).toBeInTheDocument()
  })

  it("shows the in-store substep for a pickup", () => {
    renderWithProviders(<DeliveryStepHarness deliveryMethodType="in_store" />)

    expect(screen.getByText("in-store substep")).toBeInTheDocument()
  })

  it("shows no substep for a delivery family it does not know", () => {
    renderWithProviders(<DeliveryStepHarness deliveryMethodType="drone" />)

    expect(screen.queryByText("courier substep")).not.toBeInTheDocument()
  })

  it("shows no substep before the form carries a delivery family at all", () => {
    renderWithProviders(<UnsetDeliveryStepHarness />)

    expect(observed.form?.getValues("deliveryMethodType")).toBeUndefined()
    expect(screen.queryByText("courier substep")).not.toBeInTheDocument()
    expect(screen.queryByText("locker substep")).not.toBeInTheDocument()
    expect(screen.queryByText("in-store substep")).not.toBeInTheDocument()
  })
})

describe("DeliveryStep continue button", () => {
  it("advances the checkout from the delivery step", async () => {
    renderWithProviders(<DeliveryStepHarness />)

    await userEvent.click(screen.getByRole("button", { name: /Payment/u }))

    expect(checkoutForm.onNext.mock.calls[0]?.[0]).toBe(CHECKOUT_STEP_ID.DELIVERY)
  })

  it("is disabled while the checkout is working", () => {
    checkoutForm.isPending = true
    renderWithProviders(<DeliveryStepHarness />)

    expect(screen.getByRole("button", { name: /Payment/u })).toBeDisabled()
  })
})
