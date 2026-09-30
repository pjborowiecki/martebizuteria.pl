import { type JSX, type ReactNode, useState } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

import { AttributeFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-locale-controls"
import {
  AttributeForm,
  AttributeFormProvider,
  useAttributeForm,
} from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-form-provider"
import { AttributeSheetFooter } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-sheet-footer"

const mutations = vi.hoisted(() => ({
  create: vi.fn(() => Promise.resolve({ id: "attribute-created" })),
  update: vi.fn(() => Promise.resolve({ id: "attribute-material" })),
}))

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock("sonner", () => ({ toast: { error: toasts.error, success: toasts.success } }))
vi.mock("~/src/modules/product-attribute/use-cases/create-product-attribute", () => ({ createProductAttribute: mutations.create }))
vi.mock("~/src/modules/product-attribute/use-cases/update-product-attribute", () => ({ updateProductAttribute: mutations.update }))

const attribute = (overrides: Partial<ProductAttribute["adminListItem"]> = {}): ProductAttribute["adminListItem"] => ({
  allowedValues: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  handle: "material",
  id: "attribute-material",
  productCount: 0,
  rank: 0,
  titles: { "en-US": "Material", "pl-PL": "Materiał" },
  type: "text",
  unit: "",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
})

const FormFiller = ({
  handle = "colour",
  options,
}: Readonly<{ handle?: string; options?: ProductAttribute["formValues"]["allowedValues"] }>): JSX.Element => {
  const { setValue } = useAttributeForm()

  return (
    <button
      onClick={() => {
        setValue("handle", handle)
        setValue("titles.en-US", "Colour")
        setValue("titles.pl-PL", "Kolor")
        setValue("type", options === undefined ? "text" : "select")
        setValue("allowedValues", options ?? [])
        setValue("unit", "")
      }}
      type="button"
    >
      fill the form
    </button>
  )
}

const ClosableAttributeForm = (): JSX.Element => {
  const [open, setOpen] = useState(true)

  return (
    <AttributeFormLocaleControlsProvider>
      <AttributeFormProvider attribute={undefined} mode="create" onDismiss={noop} open={open}>
        <AttributeForm>
          <FormFiller />
        </AttributeForm>
        <AttributeSheetFooter />
      </AttributeFormProvider>
      <button
        onClick={() => {
          setOpen(false)
        }}
        type="button"
      >
        close the sheet
      </button>
    </AttributeFormLocaleControlsProvider>
  )
}

const noop = (): void => {}

const OrphanAttributeFormConsumer = (): JSX.Element => {
  useAttributeForm()

  return <span>never rendered</span>
}

const renderForm = ({
  children = <div />,
  mode,
  onDismiss = vi.fn<() => void>(),
  open = true,
  row,
}: {
  children?: ReactNode
  mode: "create" | "edit"
  onDismiss?: () => void
  open?: boolean
  row?: ProductAttribute["adminListItem"]
}) =>
  renderWithProviders(
    <AttributeFormLocaleControlsProvider>
      <AttributeFormProvider attribute={row} mode={mode} onDismiss={onDismiss} open={open}>
        <AttributeForm>{children}</AttributeForm>
        <AttributeSheetFooter />
      </AttributeFormProvider>
    </AttributeFormLocaleControlsProvider>,
  )

describe("AttributeSheetFooter", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("offers to create a new attribute", () => {
    renderForm({ mode: "create" })

    expect(screen.getByRole("button", { name: "Create attribute" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled()
  })

  it("offers to save an existing attribute", () => {
    renderForm({ mode: "edit", row: attribute() })

    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Create attribute" })).toBeNull()
  })

  it("dismisses the sheet from the cancel button", async () => {
    const onDismiss = vi.fn<() => void>()
    renderForm({ mode: "create", onDismiss })

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})

describe("AttributeFormProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("sends the edited attribute with its id to the update use case", async () => {
    renderForm({ mode: "edit", row: attribute() })

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(mutations.update).toHaveBeenCalledExactlyOnceWith({
        data: {
          allowedValues: [],
          handle: "material",
          id: "attribute-material",
          titles: { "en-US": "Material", "pl-PL": "Materiał" },
          type: "text",
          unit: "",
        },
      })
    })
    expect(toasts.success).toHaveBeenCalledWith("Attribute saved", { description: "Your changes have been saved." })
  })

  it("never calls the create use case while a blank form is invalid", async () => {
    renderForm({ mode: "create" })

    await userEvent.click(screen.getByRole("button", { name: "Create attribute" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalled()
    })
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it("names both untranslated locales when a blank form is submitted", async () => {
    renderForm({ mode: "create" })

    await userEvent.click(screen.getByRole("button", { name: "Create attribute" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Missing translations", {
        description: "Fill in the name (and option labels if applicable) for: PL-PL, EN-US.",
      })
    })
  })

  it("discards a stored option row that is missing a locale label, so the choice attribute has none left", async () => {
    renderForm({
      mode: "edit",
      row: attribute({
        allowedValues: [{ labels: { "en-US": "", "pl-PL": "Srebro" }, value: "silver" }],
        type: "select",
      }),
    })

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Fix form errors", {
        description: "Add at least one allowed value for this type.",
      })
    })
    expect(mutations.update).not.toHaveBeenCalled()
  })

  it("submits a complete choice attribute with its options", async () => {
    renderForm({
      mode: "edit",
      row: attribute({
        allowedValues: [{ labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" }],
        type: "select",
      }),
    })

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(mutations.update).toHaveBeenCalledExactlyOnceWith({
        data: {
          allowedValues: [{ labels: { "en-US": "Silver", "pl-PL": "Srebro" }, value: "silver" }],
          handle: "material",
          id: "attribute-material",
          titles: { "en-US": "Material", "pl-PL": "Materiał" },
          type: "select",
          unit: "",
        },
      })
    })
  })

  it("asks for at least one option when a choice attribute has none", async () => {
    renderForm({ mode: "edit", row: attribute({ type: "select" }) })

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Fix form errors", {
        description: "Add at least one allowed value for this type.",
      })
    })
    expect(mutations.update).not.toHaveBeenCalled()
  })

  it("flags a duplicate handle on the field the server rejected", async () => {
    mutations.update.mockRejectedValueOnce(Object.assign(new Error("conflict"), { code: "CONFLICT" }))
    renderForm({ mode: "edit", row: attribute() })

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", {
        description: "An attribute with this URL slug already exists.",
      })
    })
  })
})

describe("AttributeFormProvider creating an attribute", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("names the missing option translation while preserving the complete option", async () => {
    renderForm({
      children: (
        <FormFiller
          options={[
            { labels: { "en-US": "Gold", "pl-PL": "Złoto" }, value: "gold" },
            { labels: { "en-US": "", "pl-PL": "Srebro" }, value: "silver" },
          ]}
        />
      ),
      mode: "create",
    })

    await userEvent.click(screen.getByRole("button", { name: "fill the form" }))
    await userEvent.click(screen.getByRole("button", { name: "Create attribute" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Missing translations", { description: "Fill in option labels for: EN-US." })
    })
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it("sends a complete draft to the create use case", async () => {
    renderForm({ children: <FormFiller />, mode: "create" })

    await userEvent.click(screen.getByRole("button", { name: "fill the form" }))
    await userEvent.click(screen.getByRole("button", { name: "Create attribute" }))

    await waitFor(() => {
      expect(mutations.create).toHaveBeenCalledExactlyOnceWith({
        data: {
          allowedValues: [],
          handle: "colour",
          titles: { "en-US": "Colour", "pl-PL": "Kolor" },
          type: "text",
          unit: "",
        },
      })
    })
    expect(toasts.success).toHaveBeenCalledWith("Attribute created", {
      description: "Your attribute has been created successfully.",
    })
  })

  it("reports a failed creation without blaming a field", async () => {
    mutations.create.mockRejectedValueOnce(new Error("network down"))
    renderForm({ children: <FormFiller />, mode: "create" })

    await userEvent.click(screen.getByRole("button", { name: "fill the form" }))
    await userEvent.click(screen.getByRole("button", { name: "Create attribute" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", {
        description: "The attribute could not be saved. Please try again.",
      })
    })
  })

  it("refuses to update an attribute that has no id", async () => {
    renderForm({ children: <FormFiller />, mode: "edit" })

    await userEvent.click(screen.getByRole("button", { name: "fill the form" }))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", {
        description: "The attribute could not be saved. Please try again.",
      })
    })
    expect(mutations.update).not.toHaveBeenCalled()
  })

  it("reports a plain validation failure that no locale or option explains", async () => {
    renderForm({ children: <FormFiller handle="Not A Slug" />, mode: "create" })

    await userEvent.click(screen.getByRole("button", { name: "fill the form" }))
    await userEvent.click(screen.getByRole("button", { name: "Create attribute" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Fix form errors", {
        description: "Check highlighted fields and try again.",
      })
    })
    expect(mutations.create).not.toHaveBeenCalled()
  })

  it("discards the draft once the sheet closes", async () => {
    renderWithProviders(<ClosableAttributeForm />)

    await userEvent.click(screen.getByRole("button", { name: "fill the form" }))
    await userEvent.click(screen.getByRole("button", { name: "close the sheet" }))
    await userEvent.click(screen.getByRole("button", { name: "Create attribute" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalled()
    })
    expect(mutations.create).not.toHaveBeenCalled()
  })
})

describe("useAttributeForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("refuses to work outside the provider", () => {
    expect(() => renderWithProviders(<OrphanAttributeFormConsumer />)).toThrow("useAttributeForm must be used within AttributeFormProvider")
  })
})
