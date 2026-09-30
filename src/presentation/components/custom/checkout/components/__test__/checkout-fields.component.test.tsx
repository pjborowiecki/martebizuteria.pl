import { type JSX } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type CheckoutFormSchema, checkoutSchema } from "~/src/modules/checkout/checkout.zod"

import {
  CheckoutAddonField,
  CheckoutCheckboxField,
  CheckoutPhoneField,
  CheckoutRadioField,
  CheckoutTextField,
  OptionCard,
} from "~/src/presentation/components/custom/checkout/components/checkout-fields"

afterEach(() => {
  cleanup()
})

const FieldsHarness = ({ defaultValues = {} }: Readonly<{ defaultValues?: Partial<CheckoutFormSchema> }>): JSX.Element => {
  const form = useForm<CheckoutFormSchema>({ defaultValues, mode: "onTouched", resolver: zodResolver(checkoutSchema) })

  return (
    <form>
      <CheckoutTextField control={form.control} label="Email" name="email" required />
      <CheckoutTextField control={form.control} label="City" name="city" />
      <CheckoutTextField control={form.control} displayValue="00-640" label="Post code" name="postalCode" />
      <CheckoutTextField control={form.control} label="Province" name="province" readOnly />
      <CheckoutPhoneField control={form.control} label="Phone" name="phone" />
      <CheckoutAddonField addon={<span>Change</span>} control={form.control} label="Locker" name="lockerId" />
      <CheckoutRadioField control={form.control} name="deliveryMethod">
        <OptionCard icon={<span>C</span>} id="courier" label="Courier" value="courier" />
        <OptionCard description="2 days" icon={<span>L</span>} id="locker" label="Locker" value="locker" />
      </CheckoutRadioField>
      <CheckoutCheckboxField control={form.control} label="Same as shipping" name="sameAsShipping" />
      <output data-testid="values">{JSON.stringify(form.watch())}</output>
    </form>
  )
}

const storedValues = (): string => screen.getByTestId("values").textContent

describe("CheckoutTextField", () => {
  it("labels the input and marks a required field with an asterisk", () => {
    renderWithProviders(<FieldsHarness />)

    expect(screen.getByLabelText(/Email/u)).toBeInTheDocument()
    expect(screen.getByText("*")).toBeInTheDocument()
  })

  it("shows the value the form holds", () => {
    renderWithProviders(<FieldsHarness defaultValues={{ email: "anna@example.com" }} />)

    expect(screen.getByLabelText(/Email/u)).toHaveValue("anna@example.com")
  })

  it("writes what the shopper types back into the form", async () => {
    renderWithProviders(<FieldsHarness />)

    await userEvent.type(screen.getByLabelText("City"), "Warszawa")

    expect(storedValues()).toContain('"city":"Warszawa"')
  })

  it("prefers an explicit display value over the stored one", () => {
    renderWithProviders(<FieldsHarness defaultValues={{ postalCode: "00640" }} />)

    expect(screen.getByLabelText("Post code")).toHaveValue("00-640")
    expect(storedValues()).toContain('"postalCode":"00640"')
  })

  it("translates the validation key the schema reports for a bad email", async () => {
    renderWithProviders(<FieldsHarness />)

    await userEvent.type(screen.getByLabelText(/Email/u), "not-an-email")
    await userEvent.tab()

    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument()
    expect(screen.getByLabelText(/Email/u)).toHaveAttribute("aria-invalid", "true")
  })

  it("shows no error while the field is untouched", () => {
    renderWithProviders(<FieldsHarness />)

    expect(screen.getByLabelText(/Email/u)).toHaveAttribute("aria-invalid", "false")
    expect(screen.queryByText("Please enter a valid email address")).not.toBeInTheDocument()
  })

  it("confirms a touched, filled and valid field with a tick", async () => {
    const { container } = renderWithProviders(<FieldsHarness />)

    await userEvent.type(screen.getByLabelText("City"), "Warszawa")
    await userEvent.tab()

    expect(container.querySelector("svg.text-success")).toBeInTheDocument()
  })

  it("does not confirm a read-only field", async () => {
    const { container } = renderWithProviders(<FieldsHarness defaultValues={{ province: "Mazowieckie" }} />)

    await userEvent.click(screen.getByLabelText("Province"))
    await userEvent.tab()

    expect(container.querySelector("svg.text-success")).toBeNull()
  })
})

describe("CheckoutPhoneField", () => {
  it("prefixes the national number with the Polish dialling code", () => {
    renderWithProviders(<FieldsHarness />)

    expect(screen.getByText("+48")).toBeInTheDocument()
    expect(screen.getByLabelText("Phone")).toHaveAttribute("type", "tel")
  })

  it("reddens the prefix and translates the error for an impossible number", async () => {
    renderWithProviders(<FieldsHarness />)

    await userEvent.type(screen.getByLabelText("Phone"), "123")
    await userEvent.tab()

    expect(await screen.findByText("Please enter a valid phone number")).toBeInTheDocument()
    expect(screen.getByText("+48").className).toContain("border-destructive")
  })

  it("greens the prefix once a valid number has been entered and left", async () => {
    renderWithProviders(<FieldsHarness />)

    await userEvent.type(screen.getByLabelText("Phone"), "600123456")
    await userEvent.tab()

    expect(screen.getByText("+48").className).toContain("border-success")
  })
})

describe("CheckoutAddonField", () => {
  it("renders its label, value and the addon beside the input", () => {
    renderWithProviders(<FieldsHarness defaultValues={{ lockerId: "WAW01A" }} />)

    expect(screen.getByLabelText("Locker")).toHaveValue("WAW01A")
    expect(screen.getByText("Change")).toBeInTheDocument()
  })
})

describe("CheckoutRadioField", () => {
  it("selects the option the form already holds", () => {
    renderWithProviders(<FieldsHarness defaultValues={{ deliveryMethod: "courier" }} />)

    expect(screen.getByRole("radio", { name: /Courier/u })).toBeChecked()
    expect(screen.getByRole("radio", { name: /Locker/u })).not.toBeChecked()
  })

  it("stores the option the shopper picks", async () => {
    renderWithProviders(<FieldsHarness defaultValues={{ deliveryMethod: "courier" }} />)

    await userEvent.click(screen.getByRole("radio", { name: /Locker/u }))

    expect(storedValues()).toContain('"deliveryMethod":"locker"')
    expect(screen.getByText("2 days")).toBeInTheDocument()
  })
})

describe("CheckoutCheckboxField", () => {
  it("reflects the stored boolean", () => {
    renderWithProviders(<FieldsHarness defaultValues={{ sameAsShipping: true }} />)

    expect(screen.getByRole("checkbox", { name: "Same as shipping" })).toBeChecked()
  })

  it("writes the toggled boolean back into the form", async () => {
    renderWithProviders(<FieldsHarness defaultValues={{ sameAsShipping: true }} />)

    await userEvent.click(screen.getByRole("checkbox", { name: "Same as shipping" }))

    expect(storedValues()).toContain('"sameAsShipping":false')
  })
})
