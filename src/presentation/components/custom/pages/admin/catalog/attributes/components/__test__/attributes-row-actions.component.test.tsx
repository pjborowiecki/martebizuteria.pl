import { act, cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductAttribute } from "~/src/modules/product-attribute/product-attribute.types"

interface MutateOptions {
  readonly onSuccess: () => void
}

const sheet = vi.hoisted(() => ({ openEdit: vi.fn<(attribute: unknown) => void>() }))

const deletion = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(ids: string[], options: MutateOptions) => void>(),
}))

const browser = vi.hoisted(() => ({ writeText: vi.fn<(text: string) => Promise<void>>() }))

const toasts = vi.hoisted(() => ({ success: vi.fn<(message: string) => void>() }))

vi.mock("sonner", () => ({ toast: { success: toasts.success } }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-attributes-sheet", () => ({
  useAttributesSheet: () => ({ openEdit: sheet.openEdit }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/attributes/hooks/use-delete-attributes", () => ({
  useDeleteAttributes: () => ({ isPending: deletion.isPending, mutate: deletion.mutate }),
}))

import { AttributesRowActions } from "~/src/presentation/components/custom/pages/admin/catalog/attributes/components/attributes-row-actions"

const TIMESTAMP = new Date("2026-01-15T10:00:00.000Z")

const attribute: ProductAttribute["adminListItem"] = {
  allowedValues: null,
  createdAt: TIMESTAMP,
  handle: "material",
  id: "attribute-1",
  productCount: 3,
  rank: 1,
  titles: { "en-US": "Material", "pl-PL": "Materiał" },
  type: "text",
  unit: null,
  updatedAt: TIMESTAMP,
}

const openMenu = async (): Promise<void> => {
  renderWithProviders(<AttributesRowActions attribute={attribute} />)
  const [trigger] = screen.getAllByRole("button")
  if (trigger === undefined) {
    throw new Error("The row action trigger was not rendered")
  }
  await userEvent.click(trigger)
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  deletion.isPending = false
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: browser.writeText } })
  browser.writeText.mockResolvedValue(undefined)
})

describe("AttributesRowActions menu", () => {
  it("offers every row action with its translated label", async () => {
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Edit attribute" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy ID" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy URL Slug" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Delete attribute" })).toBeInTheDocument()
  })

  it("opens the edit sheet for the attribute it belongs to", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit attribute" }))

    expect(sheet.openEdit).toHaveBeenCalledWith(attribute)
  })

  it("copies the record id and confirms it", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy ID" }))

    expect(browser.writeText).toHaveBeenCalledWith("attribute-1")
    expect(toasts.success).toHaveBeenCalledWith("Attribute ID copied to clipboard")
  })

  it("copies the handle as the url slug", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy URL Slug" }))

    expect(browser.writeText).toHaveBeenCalledWith("material")
    expect(toasts.success).toHaveBeenCalledWith("URL Slug copied to clipboard")
  })
})

describe("AttributesRowActions deletion", () => {
  it("asks for confirmation naming the attribute", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete attribute" }))

    expect(await screen.findByText("Delete attribute?")).toBeInTheDocument()
    expect(
      await screen.findByText("This will permanently delete “Material”. Attributes assigned to products cannot be deleted."),
    ).toBeInTheDocument()
  })

  it("does not delete anything until the deletion is confirmed", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete attribute" }))

    expect(deletion.mutate).not.toHaveBeenCalled()
  })

  it("deletes only this attribute on confirmation", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete attribute" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(deletion.mutate.mock.calls[0]?.[0]).toStrictEqual(["attribute-1"])
  })

  it("closes the confirmation after the server accepts deletion", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete attribute" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    act(() => {
      deletion.mutate.mock.calls[0]?.[1].onSuccess()
    })

    await waitFor(() => {
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    })
  })
})
