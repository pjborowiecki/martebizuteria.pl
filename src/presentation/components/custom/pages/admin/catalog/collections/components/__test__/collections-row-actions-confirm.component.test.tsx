import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { collectionRow } from "./collections-grid-harness"

const deletion = vi.hoisted(() => ({
  isPending: false,
  mutate: vi.fn<(ids: string[], options: { onSuccess: () => void }) => void>(),
}))

vi.mock("sonner", () => ({ toast: { success: vi.fn() } }))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-collections-sheet", () => ({
  useCollectionsSheet: () => ({ openEdit: vi.fn() }),
}))
vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/hooks/use-delete-collections", () => ({
  useDeleteCollections: () => ({ isPending: deletion.isPending, mutate: deletion.mutate }),
}))

import { CollectionsRowActions } from "~/src/presentation/components/custom/pages/admin/catalog/collections/components/collections-row-actions"

const COLLECTION = collectionRow({ handle: "new-arrivals", id: "collection-1" })

const openConfirm = async () => {
  renderWithProviders(<CollectionsRowActions collection={COLLECTION} />)
  const [trigger] = screen.getAllByRole("button")
  if (trigger === undefined) {
    throw new Error("The row action trigger was not rendered")
  }
  await userEvent.click(trigger)
  await userEvent.click(await screen.findByRole("menuitem", { name: "Delete collection" }))
}

beforeEach(() => {
  vi.clearAllMocks()
  deletion.isPending = false
  deletion.mutate.mockReset()
})

afterEach(() => {
  cleanup()
})

describe("CollectionsRowActions confirmation lifecycle", () => {
  it("closes the confirmation once the deletion succeeds", async () => {
    deletion.mutate.mockImplementation((_ids, options) => {
      options.onSuccess()
    })
    await openConfirm()
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(screen.queryByText("Delete collection?")).toBeNull()
  })

  it("keeps the confirmation open while the deletion has not reported success", async () => {
    await openConfirm()
    await userEvent.click(await screen.findByRole("button", { name: /^Delete$/u }))

    expect(screen.getByText("Delete collection?")).toBeInTheDocument()
  })

  it("closes the confirmation when it is dismissed instead", async () => {
    await openConfirm()
    await userEvent.click(await screen.findByRole("button", { name: "Cancel" }))

    expect(screen.queryByText("Delete collection?")).toBeNull()
    expect(deletion.mutate).not.toHaveBeenCalled()
  })
})
