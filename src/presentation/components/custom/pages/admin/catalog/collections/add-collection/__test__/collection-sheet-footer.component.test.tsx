import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { CollectionSheetFooter } from "../collection-sheet-footer"

interface FormState {
  readonly dismiss: () => void
  readonly isPending: boolean
  readonly isUploading: boolean
  readonly mode: "create" | "edit"
}

const form = vi.hoisted((): { current: FormState } => ({
  current: {
    dismiss: vi.fn<() => void>(),
    isPending: false,
    isUploading: false,
    mode: "create",
  },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider", () => ({
  COLLECTION_FORM_ID: "collection-form",
  useCollectionForm: () => form.current,
}))

describe("CollectionSheetFooter", () => {
  beforeEach(() => {
    form.current = { dismiss: vi.fn<() => void>(), isPending: false, isUploading: false, mode: "create" }
  })

  afterEach(() => {
    cleanup()
  })

  it("labels the submit button for creating a new collection", () => {
    renderWithProviders(<CollectionSheetFooter />)

    expect(screen.getByRole("button", { name: "Create collection" })).toHaveAttribute("type", "submit")
  })

  it("labels the submit button for saving an existing collection", () => {
    form.current = { ...form.current, mode: "edit" }
    renderWithProviders(<CollectionSheetFooter />)

    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument()
  })

  it("submits the collection form by id rather than by nesting", () => {
    renderWithProviders(<CollectionSheetFooter />)

    expect(screen.getByRole("button", { name: "Create collection" })).toHaveAttribute("form", "collection-form")
  })

  it("dismisses the sheet from the cancel button", async () => {
    renderWithProviders(<CollectionSheetFooter />)

    await userEvent.click(screen.getByRole("button", { name: "Cancel" }))

    expect(form.current.dismiss).toHaveBeenCalledTimes(1)
  })

  it("locks both buttons while the collection is being saved", () => {
    form.current = { ...form.current, isPending: true }
    renderWithProviders(<CollectionSheetFooter />)

    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Create collection" })).toBeDisabled()
  })

  it("blocks the submit but keeps cancel usable while an image is uploading", () => {
    form.current = { ...form.current, isUploading: true }
    renderWithProviders(<CollectionSheetFooter />)

    expect(screen.getByRole("button", { name: "Create collection" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled()
  })
})
