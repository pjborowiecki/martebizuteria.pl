import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type Control, type UseFormSetValue, useForm, useWatch } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

interface LockerForm {
  lockerCity: string
  lockerId: string
}

const form = vi.hoisted((): { control?: Control<LockerForm>; setValue?: UseFormSetValue<LockerForm> } => ({}))

vi.mock("~/src/presentation/components/custom/checkout/components/checkout-form-provider", () => ({
  useCheckoutForm: () => ({ control: form.control, setValue: form.setValue }),
}))

import { type InpostPointParsed } from "~/src/integrations/inpost/inpost.zod"

import { Dialog } from "~/src/presentation/components/shadcn/dialog"

import { InpostSidebarItem } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-sidebar-item"

afterEach(cleanup)

const point = (name: string): InpostPointParsed => ({
  address_details: {
    building_number: "12",
    city: "Warszawa",
    post_code: "00-001",
    province: "mazowieckie",
    street: "Kwiatowa",
  },
  location: { latitude: 52.23, longitude: 21.01 },
  location_description: "",
  name,
})

const SidebarItemHarness = ({ lockerId = "" }: Readonly<{ lockerId?: string }>): JSX.Element => {
  const { control, setValue } = useForm<LockerForm>({ defaultValues: { lockerCity: "", lockerId } })
  form.control = control
  form.setValue = setValue
  const selection = useWatch({ control })

  return (
    <div>
      <Dialog defaultOpen>
        <InpostSidebarItem point={point("WAW01A")} />
      </Dialog>
      <output data-testid="locker-id">{selection.lockerId}</output>
      <output data-testid="locker-city">{selection.lockerCity}</output>
    </div>
  )
}

describe("InpostSidebarItem", () => {
  it("labels the row with the locker code and lists its address", () => {
    renderWithProviders(<SidebarItemHarness />)

    expect(screen.getByRole("button", { name: /WAW01A/u })).toBeInTheDocument()
    expect(screen.getByText("Kwiatowa 12, Warszawa")).toBeInTheDocument()
  })

  it("stores the locker and its city when the row is picked", async () => {
    renderWithProviders(<SidebarItemHarness />)

    await userEvent.click(screen.getByRole("button", { name: /WAW01A/u }))

    expect(screen.getByTestId("locker-id")).toHaveTextContent("WAW01A")
    expect(screen.getByTestId("locker-city")).toHaveTextContent("Warszawa")
  })

  it("leaves an unselected row unhighlighted", () => {
    renderWithProviders(<SidebarItemHarness />)

    expect(screen.getByRole("button", { name: /WAW01A/u })).not.toHaveClass("bg-muted")
  })

  it("highlights the row matching the stored locker", () => {
    renderWithProviders(<SidebarItemHarness lockerId="WAW01A" />)

    expect(screen.getByRole("button", { name: /WAW01A/u })).toHaveClass("bg-muted")
  })

  it("highlights the row as soon as it is picked", async () => {
    renderWithProviders(<SidebarItemHarness />)

    await userEvent.click(screen.getByRole("button", { name: /WAW01A/u }))

    expect(screen.getByRole("button", { name: /WAW01A/u })).toHaveClass("bg-muted")
  })
})
