import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type Control, useForm, useWatch } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

type CollectionFormValues = ProductCollection["formValues"]

const form = vi.hoisted((): { control?: Control<CollectionFormValues>; isPending: boolean } => ({ isPending: false }))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider", () => ({
  useCollectionForm: () => ({ control: form.control, isPending: form.isPending }),
}))

import { StatusSection } from "~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/_sections/status-section"

afterEach(cleanup)

const defaults = (status: CollectionStatus): CollectionFormValues => ({
  descriptions: { "en-US": "", "pl-PL": "" },
  handle: "nowosci",
  image: "",
  shortDescriptions: { "en-US": "", "pl-PL": "" },
  status,
  titles: { "en-US": "New arrivals", "pl-PL": "Nowości" },
})

type CollectionStatus = CollectionFormValues["status"]

const StatusHarness = ({ status = "draft" }: Readonly<{ status?: CollectionStatus }>): JSX.Element => {
  const { control } = useForm<CollectionFormValues>({ defaultValues: defaults(status) })
  form.control = control
  const current = useWatch({ control, name: "status" })

  return (
    <div>
      <StatusSection />
      <output data-testid="status">{current}</output>
    </div>
  )
}

const trigger = () => screen.getByRole("combobox", { name: "Status" })

beforeEach(() => {
  form.isPending = false
})

describe("StatusSection", () => {
  it("titles the section and labels the status field", () => {
    renderWithProviders(<StatusHarness />)

    expect(screen.getByText("Display Options")).toBeInTheDocument()
    expect(trigger()).toBeInTheDocument()
  })

  it("shows the status the form currently holds", () => {
    renderWithProviders(<StatusHarness status="active" />)

    expect(trigger()).toHaveTextContent("Active")
  })

  it("explains what the two statuses mean", () => {
    renderWithProviders(<StatusHarness />)

    expect(
      screen.getByLabelText(
        "Draft collections are hidden from the storefront; active collections are visible to customers. Required field.",
      ),
    ).toBeInTheDocument()
  })

  it("offers only the two collection statuses", async () => {
    renderWithProviders(<StatusHarness />)

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")

    expect(options.map((option) => option.textContent)).toStrictEqual(["Draft", "Active"])
  })

  it("writes the picked status back into the form", async () => {
    renderWithProviders(<StatusHarness />)

    await userEvent.click(trigger())
    const options = await screen.findAllByRole("option")
    const active = options.find((option) => option.textContent === "Active")
    await userEvent.click(active ?? trigger())

    expect(screen.getByTestId("status")).toHaveTextContent("active")
  })

  it("locks the status while the collection is being saved", () => {
    form.isPending = true
    renderWithProviders(<StatusHarness />)

    expect(trigger()).toBeDisabled()
  })
})
