import { type JSX } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { type UseFormReturn, useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CheckoutFormSchema } from "~/src/modules/checkout/checkout.zod"

const { addressState, checkoutForm, sessionState } = vi.hoisted(() => ({
  addressState: { rows: [] as Record<string, unknown>[] },
  checkoutForm: { isPending: false, onNext: vi.fn<(stepId: string, event?: unknown) => Promise<void>>() },
  sessionState: { signedIn: false },
}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", () => ({
  useCheckoutForm: () => checkoutForm,
}))
vi.mock("~/src/integrations/better-auth/auth.session", async () => {
  const { queryOptions } = await import("@tanstack/react-query")

  return {
    getCurrentSessionQuery: queryOptions({
      queryFn: () => (sessionState.signedIn ? { user: { id: "user-1" } } : null),
      queryKey: ["session", "current"],
    }),
  }
})
vi.mock("~/src/modules/address/use-cases/list-user-addresses", () => ({
  listUserAddressesQuery: () => ({ queryFn: () => Promise.resolve(addressState.rows), queryKey: ["address", "all"] }),
}))

const { AddressStep } = await import("~/src/presentation/components/custom/checkout/components/_steps/address-step")
const { CHECKOUT_STEP_ID } = await import("~/src/presentation/components/custom/checkout/lib/checkout-steps")

const savedAddress = (overrides: Record<string, unknown> = {}) => ({
  address1: "ul. Mokotowska 12/4",
  address2: null,
  city: "Warszawa",
  countryCode: "PL",
  createdAt: new Date(0),
  firstName: "Anna",
  id: "address-1",
  isDefault: true,
  lastName: "Kowalska",
  phone: "+48600123456",
  postalCode: "00-640",
  province: null,
  updatedAt: new Date(0),
  userId: "user-1",
  ...overrides,
})

const observed: { form?: UseFormReturn<CheckoutFormSchema> } = {}

const AddressStepHarness = ({ sameAsShipping = true }: Readonly<{ sameAsShipping?: boolean }>): JSX.Element => {
  const form = useForm<CheckoutFormSchema>({
    defaultValues: { address1: "", city: "", countryCode: "", firstName: "", lastName: "", postalCode: "", sameAsShipping },
  })
  observed.form = form
  Object.assign(checkoutForm, {
    control: form.control,
    isPending: checkoutForm.isPending,
    onNext: checkoutForm.onNext,
    setValue: form.setValue,
  })

  return <AddressStep />
}

beforeEach(() => {
  checkoutForm.onNext.mockReset()
  checkoutForm.onNext.mockResolvedValue()
  checkoutForm.isPending = false
  sessionState.signedIn = false
  addressState.rows = []
  delete observed.form
})

afterEach(() => {
  cleanup()
})

describe("AddressStep shipping fields", () => {
  it("asks for every part of the shipping address", () => {
    renderWithProviders(<AddressStepHarness />)

    expect(screen.getByLabelText(/First Name/u)).toBeInTheDocument()
    expect(screen.getByLabelText(/Last Name/u)).toBeInTheDocument()
    expect(screen.getByLabelText(/Address/u)).toBeInTheDocument()
    expect(screen.getByLabelText(/Postal Code/u)).toBeInTheDocument()
    expect(screen.getByLabelText(/City/u)).toBeInTheDocument()
  })

  it("marks the shipping fields as required", () => {
    renderWithProviders(<AddressStepHarness />)

    expect(screen.getByLabelText(/First Name/u)).toHaveAttribute("aria-required", "true")
    expect(screen.getByLabelText(/City/u)).toHaveAttribute("aria-required", "true")
  })

  it("pins the country to the translated store country and keeps it read only", () => {
    renderWithProviders(<AddressStepHarness />)

    const country = screen.getByLabelText(/Country/u)

    expect(country).toHaveValue("Poland")
    expect(country).toHaveAttribute("readonly")
  })

  it("offers the save and same-as-shipping choices", () => {
    renderWithProviders(<AddressStepHarness />)

    expect(screen.getByRole("checkbox", { name: "Save this shipping address for future use" })).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Same as shipping address" })).toBeInTheDocument()
  })

  it("uses the shipping autofill hints the browser understands", () => {
    renderWithProviders(<AddressStepHarness />)

    expect(screen.getByLabelText(/First Name/u)).toHaveAttribute("autocomplete", "shipping given-name")
    expect(screen.getByLabelText(/Postal Code/u)).toHaveAttribute("autocomplete", "shipping postal-code")
  })
})

describe("AddressStep saved addresses", () => {
  it("tells a guest there are no saved addresses", () => {
    renderWithProviders(<AddressStepHarness />)

    expect(screen.getByText("No saved addresses.")).toBeInTheDocument()
    expect(screen.queryByText("Saved Addresses")).not.toBeInTheDocument()
  })

  it("does not look up addresses for a guest", async () => {
    addressState.rows = [savedAddress()]
    renderWithProviders(<AddressStepHarness />)

    await waitFor(() => {
      expect(screen.getByText("No saved addresses.")).toBeInTheDocument()
    })
    expect(screen.queryByRole("button", { name: /Anna Kowalska/u })).not.toBeInTheDocument()
  })

  it("lists a card per stored address for a signed-in shopper", async () => {
    sessionState.signedIn = true
    addressState.rows = [savedAddress(), savedAddress({ city: "Kraków", firstName: "Jan", id: "address-2", lastName: "Nowak" })]

    renderWithProviders(<AddressStepHarness />)

    expect(await screen.findByText("Saved Addresses")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Anna Kowalska/u })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Jan Nowak/u })).toBeInTheDocument()
  })

  it("summarises each card with the street, postal code and city", async () => {
    sessionState.signedIn = true
    addressState.rows = [savedAddress()]

    renderWithProviders(<AddressStepHarness />)

    expect(await screen.findByText("ul. Mokotowska 12/4, 00-640 Warszawa")).toBeInTheDocument()
  })

  it("copies a chosen address into the shipping fields", async () => {
    sessionState.signedIn = true
    addressState.rows = [savedAddress()]
    renderWithProviders(<AddressStepHarness />)

    await userEvent.click(await screen.findByRole("button", { name: /Anna Kowalska/u }))

    expect(screen.getByLabelText(/First Name/u)).toHaveValue("Anna")
    expect(screen.getByLabelText(/Last Name/u)).toHaveValue("Kowalska")
    expect(screen.getByLabelText(/Address/u)).toHaveValue("ul. Mokotowska 12/4")
    expect(screen.getByLabelText(/Postal Code/u)).toHaveValue("00-640")
    expect(screen.getByLabelText(/City/u)).toHaveValue("Warszawa")
  })

  it("replaces missing name parts and postal codes with empty strings", async () => {
    sessionState.signedIn = true
    addressState.rows = [savedAddress({ firstName: null, lastName: null, postalCode: null })]
    renderWithProviders(<AddressStepHarness />)

    await userEvent.click(await screen.findByRole("button", { name: /ul\. Mokotowska/u }))

    expect(observed.form?.getValues("firstName")).toBe("")
    expect(observed.form?.getValues("lastName")).toBe("")
    expect(observed.form?.getValues("postalCode")).toBe("")
  })
})

describe("AddressStep billing address", () => {
  it("hides the billing block while the billing address matches the shipping one", () => {
    renderWithProviders(<AddressStepHarness />)

    expect(screen.queryByText("Billing Address")).not.toBeInTheDocument()
    expect(screen.queryByRole("checkbox", { name: "Save this billing address for future use" })).not.toBeInTheDocument()
  })

  it("reveals the billing block once the shopper unticks same as shipping", async () => {
    renderWithProviders(<AddressStepHarness />)

    await userEvent.click(screen.getByRole("checkbox", { name: "Same as shipping address" }))

    expect(await screen.findByText("Billing Address")).toBeInTheDocument()
    expect(screen.getByRole("checkbox", { name: "Save this billing address for future use" })).toBeInTheDocument()
  })

  it("uses the billing autofill hints for the second set of fields", () => {
    renderWithProviders(<AddressStepHarness sameAsShipping={false} />)

    const firstNames = screen.getAllByLabelText(/First Name/u)

    expect(firstNames).toHaveLength(2)
    expect(firstNames[1]).toHaveAttribute("autocomplete", "billing given-name")
  })

  it("copies a chosen address into the billing fields only", async () => {
    sessionState.signedIn = true
    addressState.rows = [savedAddress()]
    renderWithProviders(<AddressStepHarness sameAsShipping={false} />)

    const [, billingCard] = await screen.findAllByRole("button", { name: /Anna Kowalska/u })
    if (billingCard === undefined) {
      throw new Error("the billing address card did not render")
    }

    await userEvent.click(billingCard)

    expect(observed.form?.getValues("billingFirstName")).toBe("Anna")
    expect(observed.form?.getValues("billingCity")).toBe("Warszawa")
    expect(observed.form?.getValues("billingCountryCode")).toBe("PL")
    expect(observed.form?.getValues("firstName")).toBe("")
  })

  it("pins the billing country to the store country too", () => {
    renderWithProviders(<AddressStepHarness sameAsShipping={false} />)

    const countries = screen.getAllByLabelText(/Country/u)

    expect(countries).toHaveLength(2)
    expect(countries[1]).toHaveValue("Poland")
  })
})

describe("AddressStep continue button", () => {
  it("advances the checkout from the address step", async () => {
    renderWithProviders(<AddressStepHarness />)

    await userEvent.click(screen.getByRole("button", { name: /Delivery Method/u }))

    expect(checkoutForm.onNext.mock.calls[0]?.[0]).toBe(CHECKOUT_STEP_ID.BILLING)
  })

  it("is disabled while the checkout is working", () => {
    checkoutForm.isPending = true
    renderWithProviders(<AddressStepHarness />)

    expect(screen.getByRole("button", { name: /Delivery Method/u })).toBeDisabled()
  })

  it("does not advance while the checkout is working", async () => {
    checkoutForm.isPending = true
    renderWithProviders(<AddressStepHarness />)

    await userEvent.click(screen.getByRole("button", { name: /Delivery Method/u }))

    expect(checkoutForm.onNext).not.toHaveBeenCalled()
  })
})
