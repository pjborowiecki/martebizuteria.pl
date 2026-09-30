import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { collectionRow } from "./collections-grid-harness"

const sheet = vi.hoisted(() => ({ openEdit: vi.fn<(collection: unknown) => void>() }))

const deletion = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(ids: string[], options: { onSuccess: () => void }) => void>(),
}))

const browser = vi.hoisted(() => ({
  open: vi.fn<(url: string, target: string, features: string) => void>(),
  writeText: vi.fn<(text: string) => Promise<void>>(),
}))

const toasts = vi.hoisted(() => ({ success: vi.fn<(message: string) => void>() }))

vi.mock("sonner", () => ({ toast: { success: toasts.success } }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet", () => ({
  useCollectionsSheet: () => ({ openEdit: sheet.openEdit }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-delete-collections", () => ({
  useDeleteCollections: () => ({ isPending: deletion.isPending, mutate: deletion.mutate }),
}))

import { CollectionsRowActions } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-row-actions"

const COLLECTION = collectionRow({
  handle: "new-arrivals",
  id: "collection-1",
  titles: { "en-US": "New arrivals", "pl-PL": "Nowosci" },
})

const openMenu = async () => {
  renderWithProviders(<CollectionsRowActions collection={COLLECTION} />)
  const [trigger] = screen.getAllByRole("button")
  if (trigger === undefined) {
    throw new Error("The row action trigger was not rendered")
  }
  await userEvent.click(trigger)
}

beforeEach(() => {
  vi.clearAllMocks()
  deletion.isPending = false
  vi.stubGlobal("open", browser.open)
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: browser.writeText } })
  browser.writeText.mockResolvedValue(undefined)
})

afterEach(() => {
  cleanup()
})

describe("CollectionsRowActions menu", () => {
  it("offers every row action with its translated label", async () => {
    await openMenu()

    expect(await screen.findByRole("menuitem", { name: "Edit collection" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "View products" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy ID" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Copy link" })).toBeInTheDocument()
    expect(screen.getByRole("menuitem", { name: "Delete collection" })).toBeInTheDocument()
  })

  it("opens the edit sheet for the collection it belongs to", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Edit collection" }))

    expect(sheet.openEdit).toHaveBeenCalledWith(COLLECTION)
  })

  it("opens the storefront listing in a new tab", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "View products" }))

    expect(browser.open).toHaveBeenCalledWith("/collections/new-arrivals", "_blank", "noopener,noreferrer")
  })

  it("copies the record id and confirms it", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy ID" }))

    expect(browser.writeText).toHaveBeenCalledWith("collection-1")
    expect(toasts.success).toHaveBeenCalledWith("Collection ID copied to clipboard")
  })

  it("copies an absolute storefront link and confirms it", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Copy link" }))

    expect(browser.writeText).toHaveBeenCalledWith(`${globalThis.location.origin}/collections/new-arrivals`)
    expect(toasts.success).toHaveBeenCalledWith("Collection link copied to clipboard")
  })
})

describe("CollectionsRowActions deletion", () => {
  it("asks for confirmation naming the collection", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete collection" }))

    expect(await screen.findByText("Delete collection?")).toBeInTheDocument()
    expect(await screen.findByText("This will permanently delete “New arrivals”. This action cannot be undone.")).toBeInTheDocument()
  })

  it("does not delete anything until the deletion is confirmed", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete collection" }))

    expect(deletion.mutate).not.toHaveBeenCalled()
  })

  it("deletes only this collection on confirmation", async () => {
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete collection" }))
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(deletion.mutate.mock.calls[0]?.[0]).toStrictEqual(["collection-1"])
  })

  it("keeps the confirmation buttons inert while the deletion runs", async () => {
    deletion.isPending = true
    await openMenu()
    await userEvent.click(await screen.findByRole("menuitem", { name: "Delete collection" }))

    expect(await screen.findByRole("button", { name: "Cancel" })).toBeDisabled()
  })
})
