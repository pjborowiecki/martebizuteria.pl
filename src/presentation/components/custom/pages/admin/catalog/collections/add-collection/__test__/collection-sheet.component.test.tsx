import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import { CollectionSheet } from "../collection-sheet"

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock("~/src/modules/product-collection/use-cases/create-collection", () => ({
  createCollection: vi.fn(() => Promise.resolve({ handle: "silver-rings", id: "col-1" })),
}))
vi.mock("~/src/modules/product-collection/use-cases/update-collection", () => ({
  updateCollection: vi.fn(() => Promise.resolve({ handle: "silver-rings", id: "col-1" })),
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))
vi.mock("~/src/presentation/components/custom/image-upload/hooks/use-image-upload", () => ({
  useImageUpload: () => ({ isUploading: false, uploadFiles: vi.fn<(files: readonly File[]) => Promise<string[]>>() }),
}))

const collection = (): ProductCollection["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: { "en-US": "Rings in silver", "pl-PL": "Pierscionki" },
  handle: "silver-rings",
  id: "col-1",
  image: null,
  metadata: null,
  productCount: 2,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  titles: { "en-US": "Silver rings", "pl-PL": "Srebrne pierscionki" },
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
})

describe("CollectionSheet", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    cleanup()
    localStorage.clear()
  })

  it("renders nothing while the sheet is closed", () => {
    renderWithProviders(
      <CollectionSheet collection={undefined} mode="create" onOpenChange={vi.fn<(open: boolean) => void>()} open={false} />,
    )

    expect(screen.queryByText("Add New Collection")).toBeNull()
  })

  it("titles and describes the sheet for creating a collection", () => {
    renderWithProviders(<CollectionSheet collection={undefined} mode="create" onOpenChange={vi.fn<(open: boolean) => void>()} open />)

    expect(screen.getByText("Add New Collection")).toBeInTheDocument()
    expect(screen.getByText("Create a new collection. It will be added to the end of the list.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create collection" })).toBeInTheDocument()
  })

  it("titles and describes the sheet for editing a collection", () => {
    renderWithProviders(<CollectionSheet collection={collection()} mode="edit" onOpenChange={vi.fn<(open: boolean) => void>()} open />)

    expect(screen.getByText("Edit collection")).toBeInTheDocument()
    expect(screen.getByText("Update this collection’s details, status, and media.")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
  })

  it("prefills the form from the collection being edited", () => {
    renderWithProviders(<CollectionSheet collection={collection()} mode="edit" onOpenChange={vi.fn<(open: boolean) => void>()} open />)

    expect(screen.getByDisplayValue("silver-rings")).toBeInTheDocument()
  })

  it("closes the sheet when the form is cancelled", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    renderWithProviders(<CollectionSheet collection={undefined} mode="create" onOpenChange={onOpenChange} open />)

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it("closes the sheet once the collection has been saved", async () => {
    const onOpenChange = vi.fn<(open: boolean) => void>()
    renderWithProviders(<CollectionSheet collection={collection()} mode="edit" onOpenChange={onOpenChange} open />)

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false)
    })
  })

  it("wires the footer submit to the collection form", () => {
    renderWithProviders(<CollectionSheet collection={undefined} mode="create" onOpenChange={vi.fn<(open: boolean) => void>()} open />)

    expect(screen.getByRole("button", { name: "Create collection" })).toHaveAttribute("form", "collection-form")
  })
})
