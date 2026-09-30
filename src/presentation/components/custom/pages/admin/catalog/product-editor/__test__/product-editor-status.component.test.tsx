import { type JSX, useEffect } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { ProductEditorStatus } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-status"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

afterEach(cleanup)

const StatusHarness = ({
  errorMessage,
  status,
}: Readonly<{
  errorMessage?: string
  status: ProductFormValues["status"]
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: {
      ...createEmptyProductFormValues(),
      status,
    },
  })
  const current = useWatch({
    control: form.control,
    name: "status",
  })
  useEffect(() => {
    if (errorMessage !== undefined) {
      form.setError("status", {
        message: errorMessage,
      })
    }
  }, [errorMessage, form])

  return (
    <FormProvider {...form}>
      <ProductEditorStatus />
      <output data-testid="status-value">{current}</output>
    </FormProvider>
  )
}

const HINT = "Draft products are hidden from the storefront; active products are visible to customers; archived products are not sold."

describe("ProductEditorStatus", () => {
  it("shows the localized label of the status held in the form", () => {
    renderWithProviders(<StatusHarness status="active" />)

    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent("Active")
  })

  it.each([
    ["draft", "Draft"],
    ["archived", "Archived"],
  ] as const)("shows %s as %s", (status, label) => {
    renderWithProviders(<StatusHarness status={status} />)

    expect(screen.getByRole("combobox", { name: "Status" })).toHaveTextContent(label)
  })

  it("titles the card and labels the field", () => {
    renderWithProviders(<StatusHarness status="draft" />)

    expect(screen.getAllByText("Status")).toHaveLength(2)
  })

  it("explains the three statuses through the required field hint", () => {
    renderWithProviders(<StatusHarness status="draft" />)

    expect(screen.getByLabelText(`${HINT} Required field.`)).toBeInTheDocument()
  })

  it("offers every admin status once the select is opened", async () => {
    renderWithProviders(<StatusHarness status="draft" />)

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }))

    const options = await screen.findAllByRole("option")

    expect(options.map((item) => item.textContent)).toStrictEqual(["Draft", "Active", "Archived"])
  })

  it("writes the picked status back into the form", async () => {
    renderWithProviders(<StatusHarness status="draft" />)

    await userEvent.click(screen.getByRole("combobox", { name: "Status" }))
    const options = await screen.findAllByRole("option")
    const archived = options.find((item) => item.textContent === "Archived")
    await userEvent.click(archived ?? screen.getByRole("combobox", { name: "Status" }))

    expect(screen.getByTestId("status-value")).toHaveTextContent("archived")
  })

  it("renders no error while the field is valid", () => {
    renderWithProviders(<StatusHarness status="draft" />)

    expect(screen.getByRole("combobox", { name: "Status" })).toHaveAttribute("aria-invalid", "false")
    expect(screen.queryByText("Enter a product name.")).not.toBeInTheDocument()
  })

  it("translates a known validation key into the localized error", async () => {
    renderWithProviders(<StatusHarness errorMessage="form.validation.titleRequired" status="draft" />)

    expect(await screen.findByText("Enter a product name.")).toBeInTheDocument()
    expect(screen.getByRole("combobox", { name: "Status" })).toHaveAttribute("aria-invalid", "true")
  })

  it("passes an unrecognized error message through untranslated", async () => {
    renderWithProviders(<StatusHarness errorMessage="Something broke" status="draft" />)

    expect(await screen.findByText("Something broke")).toBeInTheDocument()
  })
})
