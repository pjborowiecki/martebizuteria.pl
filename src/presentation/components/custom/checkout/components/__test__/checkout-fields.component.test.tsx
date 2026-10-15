import { type JSX } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

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

const contactStepResolver = vi.fn(zodResolver(checkoutSchema))

const ContactStepHarness = (): JSX.Element => {
  const form = useForm<CheckoutFormSchema>({
    defaultValues: { email: "", phone: "" },
    mode: "onTouched",
    resolver: contactStepResolver,
  })

  return (
    <form>
      <CheckoutTextField control={form.control} label="Email" name="email" required />
      <CheckoutPhoneField control={form.control} label="Phone" name="phone" />
      <button
        type="button"
        onClick={() => {
          void form.trigger(["email", "phone"], { shouldFocus: true })
        }}
      >
        Next
      </button>
    </form>
  )
}

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

  it("confirms a field the browser autofills while the shopper is still in another one", async () => {
    const { container } = renderWithProviders(<FieldsHarness />)

    await userEvent.click(screen.getByLabelText(/Email/u))
    fireEvent.change(screen.getByLabelText("City"), { target: { value: "Warszawa" } })

    await waitFor(() => {
      expect(container.querySelector("svg.text-success")).toBeInTheDocument()
    })
  })

  it("flags an invalid value the browser autofills without waiting for the shopper to leave it", async () => {
    renderWithProviders(<FieldsHarness />)

    await userEvent.click(screen.getByLabelText("City"))
    fireEvent.change(screen.getByLabelText(/Email/u), { target: { value: "not-an-email" } })

    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument()
  })

  it("waits for the shopper to leave the field they are typing in before confirming it", async () => {
    const { container } = renderWithProviders(<FieldsHarness />)

    await userEvent.type(screen.getByLabelText("City"), "Warszawa")

    expect(container.querySelector("svg.text-success")).toBeNull()
  })

  it("mirrors its value into the attribute that tells an autofill preview apart from a fill", async () => {
    renderWithProviders(<FieldsHarness />)

    expect(screen.getByLabelText("City")).toHaveAttribute("value", "")

    await userEvent.type(screen.getByLabelText("City"), "Warszawa")

    expect(screen.getByLabelText("City")).toHaveAttribute("value", "Warszawa")
  })

  it("hides its error and puts back the usual underline while the browser previews an autofill suggestion in it", async () => {
    renderWithProviders(<FieldsHarness />)
    const email = screen.getByLabelText(/Email/u)

    await userEvent.type(email, "not-an-email")
    await userEvent.tab()
    const error = await screen.findByRole("alert")

    expect(error).toHaveClass("group-has-autofill-preview/field:invisible")
    expect(error.closest("[data-slot=field]")).toContainElement(email)
    expect(email).toHaveClass(
      "aria-invalid:border-destructive",
      "autofill-preview:aria-invalid:border-border",
      "autofill-preview:aria-invalid:focus-visible:border-foreground",
    )
  })

  it("keeps a confirmed value clear of the tick", async () => {
    renderWithProviders(<FieldsHarness />)

    await userEvent.type(screen.getByLabelText("City"), "Warszawa")
    await userEvent.tab()

    expect(screen.getByLabelText("City")).toHaveClass("pr-9")
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

  it("keeps its tight tracking whenever its label floats", () => {
    renderWithProviders(<FieldsHarness />)
    const label = screen.getByText("Phone")

    expect(label).toHaveClass("peer-floated:top-0", "peer-floated:tracking-[0.05em]")
    expect(label).not.toHaveClass("peer-floated:tracking-[0.22em]")
  })

  it("hides its error and neutralises the prefix while the browser previews an autofill suggestion", async () => {
    renderWithProviders(<FieldsHarness />)
    const phone = screen.getByLabelText("Phone")

    await userEvent.type(phone, "123")
    await userEvent.tab()
    const error = await screen.findByRole("alert")

    expect(error).toHaveClass("group-has-autofill-preview/field:invisible")
    expect(error.closest("[data-slot=field]")).toContainElement(phone)
    expect(screen.getByText("+48")).toHaveClass("border-destructive", "group-has-autofill-preview/field:border-border")
  })

  it("greens the prefix for a number the browser autofills", async () => {
    renderWithProviders(<FieldsHarness />)

    await userEvent.click(screen.getByLabelText("City"))
    fireEvent.change(screen.getByLabelText("Phone"), { target: { value: "600123456" } })

    await waitFor(() => {
      expect(screen.getByText("+48").className).toContain("border-success")
    })
  })

  it("greens the prefix once a valid number has been entered and left", async () => {
    renderWithProviders(<FieldsHarness />)

    await userEvent.type(screen.getByLabelText("Phone"), "600123456")
    await userEvent.tab()

    expect(screen.getByText("+48").className).toContain("border-success")
  })
})

describe("a field Next flagged before the shopper touched it", () => {
  it("drops its error as soon as autofill puts a valid address into it while the shopper is still there", async () => {
    renderWithProviders(<ContactStepHarness />)
    const email = screen.getByLabelText(/Email/u)

    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument()
    expect(email).toHaveFocus()

    fireEvent.change(email, { target: { value: "piotr@example.com" } })

    await waitFor(() => {
      expect(screen.queryByText("Please enter a valid email address")).not.toBeInTheDocument()
    })
    expect(email).toHaveFocus()
  })

  it("swaps its error for the one the new value earns", async () => {
    renderWithProviders(<ContactStepHarness />)
    const phone = screen.getByLabelText("Phone")

    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByText("Phone number is required")).toBeInTheDocument()
    await userEvent.click(phone)
    fireEvent.change(phone, { target: { value: "123" } })

    expect(await screen.findByText("Please enter a valid phone number")).toBeInTheDocument()
    expect(screen.queryByText("Phone number is required")).not.toBeInTheDocument()
  })

  it("checks it once per change after its first change has touched it", async () => {
    renderWithProviders(<ContactStepHarness />)

    await userEvent.click(screen.getByRole("button", { name: "Next" }))
    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument()
    await userEvent.keyboard("p")
    contactStepResolver.mockClear()

    await userEvent.keyboard("i")

    expect(contactStepResolver).toHaveBeenCalledOnce()
    expect(await screen.findByText("Please enter a valid email address")).toBeInTheDocument()
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
