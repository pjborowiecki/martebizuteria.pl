import { act, cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { onOpenChange } = vi.hoisted(() => ({ onOpenChange: vi.fn<(open: boolean) => void>() }))

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("~/src/modules/product-attribute/use-cases/create-product-attribute", () => ({ createProductAttribute: vi.fn() }))
vi.mock("~/src/modules/product-attribute/use-cases/update-product-attribute", () => ({ updateProductAttribute: vi.fn() }))

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"
import { updateProductAttribute } from "~/src/modules/product-attribute/use-cases/update-product-attribute"

import { AttributeSheet } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/add-attribute/attribute-sheet"

const attribute = (overrides: Partial<ProductAttribute["adminListItem"]> = {}): ProductAttribute["adminListItem"] => ({
  allowedValues: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  handle: "material",
  id: "attribute-material",
  productCount: 0,
  rank: 0,
  titles: { "en-US": "Material", "pl-PL": "Materiał" },
  type: "text",
  unit: "mm",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
})

describe("AttributeSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("waits for a saved edit before closing and prevents duplicate submissions", async () => {
    const pending = Promise.withResolvers<Awaited<ReturnType<typeof updateProductAttribute>>>()
    vi.mocked(updateProductAttribute).mockReturnValueOnce(pending.promise)
    renderWithProviders(<AttributeSheet attribute={attribute()} mode="edit" onOpenChange={onOpenChange} open />)

    await userEvent.click(await screen.findByRole("button", { name: "Save changes" }))
    await waitFor(() => {
      expect(updateProductAttribute).toHaveBeenCalledOnce()
    })
    expect(vi.mocked(updateProductAttribute).mock.calls[0]?.[0]?.data).toMatchObject({ handle: "material", id: "attribute-material" })
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(onOpenChange).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))
    expect(updateProductAttribute).toHaveBeenCalledOnce()

    await act(async () => {
      pending.resolve({ handle: "material", id: "attribute-material" })
      await pending.promise
    })
    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("renders nothing while it is closed", () => {
    renderWithProviders(<AttributeSheet attribute={undefined} mode="create" onOpenChange={onOpenChange} open={false} />)

    expect(screen.queryByText("Add attribute")).toBeNull()
  })

  it("titles and explains the create sheet", () => {
    renderWithProviders(<AttributeSheet attribute={undefined} mode="create" onOpenChange={onOpenChange} open />)

    expect(screen.getByText("Add attribute")).toBeInTheDocument()
    expect(screen.getByText("Create a reusable specification field your team can assign on products.")).toBeInTheDocument()
  })

  it("titles and explains the edit sheet", () => {
    renderWithProviders(<AttributeSheet attribute={attribute()} mode="edit" onOpenChange={onOpenChange} open />)

    expect(screen.getByText("Edit attribute")).toBeInTheDocument()
    expect(screen.getByText("Update storefront labels per locale, value type, and allowed options.")).toBeInTheDocument()
  })

  it("opens a blank create form on the polish locale", () => {
    renderWithProviders(<AttributeSheet attribute={undefined} mode="create" onOpenChange={onOpenChange} open />)

    expect(screen.getByLabelText("Language")).toHaveTextContent("PL-PL")
    expect(screen.getByText(/0 of 2 filled/u)).toBeInTheDocument()
    expect(screen.queryByText("ID")).toBeNull()
  })

  it("loads the saved slug and id into the edit form", () => {
    renderWithProviders(<AttributeSheet attribute={attribute()} mode="edit" onOpenChange={onOpenChange} open />)

    expect(screen.getByDisplayValue("material")).toBeInTheDocument()
    expect(screen.getByDisplayValue("attribute-material")).toHaveAttribute("readonly")
  })

  it("shows both locale titles as complete for a translated attribute", () => {
    renderWithProviders(<AttributeSheet attribute={attribute()} mode="edit" onOpenChange={onOpenChange} open />)

    expect(screen.getByText(/2 of 2 filled/u)).toBeInTheDocument()
  })

  it("closes the sheet when the admin cancels", async () => {
    renderWithProviders(<AttributeSheet attribute={undefined} mode="create" onOpenChange={onOpenChange} open />)

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("offers the create action rather than the save action in create mode", () => {
    renderWithProviders(<AttributeSheet attribute={undefined} mode="create" onOpenChange={onOpenChange} open />)

    expect(screen.getByRole("button", { name: "Create attribute" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Save changes" })).toBeNull()
  })
})
