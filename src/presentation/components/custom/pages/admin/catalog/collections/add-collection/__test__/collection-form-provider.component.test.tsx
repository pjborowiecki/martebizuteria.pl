import { type JSX, useCallback } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter } from "~/src/platform/testing/lib/render"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COLLECTION_QUERY_KEYS } from "~/src/modules/product-collection/product-collection.constants"
import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

import type * as LocaleControls from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"

import { COLLECTION_FORM_ID, CollectionForm, CollectionFormProvider, useCollectionForm } from "../collection-form-provider"

const server = vi.hoisted(() => ({
  create: vi.fn((values: unknown) => Promise.resolve({ handle: "silver-rings", id: "col-1", values })),
  update: vi.fn((values: unknown) => Promise.resolve({ handle: "silver-rings", id: "col-1", values })),
}))

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

const locales = vi.hoisted(() => ({ focus: vi.fn<(list: readonly string[]) => void>() }))

vi.mock("sonner", () => ({ toast: { error: toasts.error, success: toasts.success } }))
vi.mock("~/src/modules/product-collection/use-cases/create-collection", () => ({
  createCollection: (options: { data: unknown }) => server.create(options.data),
}))
vi.mock("~/src/modules/product-collection/use-cases/update-collection", () => ({
  updateCollection: (options: { data: unknown }) => server.update(options.data),
}))
vi.mock(
  "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls",
  async (importOriginal) => ({
    ...(await importOriginal<typeof LocaleControls>()),
    useCatalogFormLocaleControls: () => ({ focusIncompleteLocales: locales.focus }),
  }),
)

const collection = (overrides: Partial<ProductCollection["adminListItem"]> = {}): ProductCollection["adminListItem"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  descriptions: { "en-US": "Rings in silver", "pl-PL": "Pierscionki" },
  handle: "silver-rings",
  id: "col-1",
  image: "https://cdn.example.test/silver.webp",
  metadata: null,
  productCount: 2,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  titles: { "en-US": "Silver rings", "pl-PL": "Srebrne pierscionki" },
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
})

const FormProbe = (): JSX.Element => {
  const { collectionId, isPending, isUploading, mode, setUploading, setValue } = useCollectionForm()

  const fillValid = useCallback(() => {
    setValue("handle", "silver-rings")
    setValue("titles", { "en-US": "Silver rings", "pl-PL": "Srebrne pierscionki" })
  }, [setValue])

  const fillMissingEnglishTitle = useCallback(() => {
    setValue("handle", "silver-rings")
    setValue("titles", { "en-US": "", "pl-PL": "Srebrne pierscionki" })
  }, [setValue])

  const fillInvalidHandle = useCallback(() => {
    setValue("handle", "Silver Rings!")
    setValue("titles", { "en-US": "Silver rings", "pl-PL": "Srebrne pierscionki" })
  }, [setValue])

  const startUpload = useCallback(() => {
    setUploading(true)
  }, [setUploading])

  return (
    <>
      <output>{`${mode}:${collectionId ?? "none"}:${String(isPending)}:${String(isUploading)}`}</output>
      <button type="button" onClick={fillValid}>
        fill valid
      </button>
      <button type="button" onClick={fillMissingEnglishTitle}>
        fill missing title
      </button>
      <button type="button" onClick={fillInvalidHandle}>
        fill invalid handle
      </button>
      <button type="button" onClick={startUpload}>
        start upload
      </button>
      <button type="submit" form={COLLECTION_FORM_ID}>
        save
      </button>
    </>
  )
}

const renderProvider = ({
  mode = "create",
  row,
}: {
  mode?: "create" | "edit"
  row?: ProductCollection["adminListItem"]
} = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, "invalidateQueries")
  const onDismiss = vi.fn<() => void>()
  const onSuccess = vi.fn<() => void>()

  const view = render(
    <TestProviders queryClient={queryClient} router={createTestRouter()}>
      <CollectionFormProvider collection={row} mode={mode} onDismiss={onDismiss} onSuccess={onSuccess} open>
        <CollectionForm>
          <FormProbe />
        </CollectionForm>
      </CollectionFormProvider>
    </TestProviders>,
  )

  return { ...view, invalidate, onDismiss, onSuccess }
}

describe("CollectionFormProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("publishes the create mode and no collection id to the form", () => {
    renderProvider()

    expect(screen.getByRole("status")).toHaveTextContent("create:none:false:false")
  })

  it("publishes the edited collection id to the form", () => {
    renderProvider({ mode: "edit", row: collection() })

    expect(screen.getByRole("status")).toHaveTextContent("edit:col-1:false:false")
  })

  it("tracks an image upload so the footer can block the submit", async () => {
    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "start upload" }))

    expect(screen.getByRole("status")).toHaveTextContent("create:none:false:true")
  })

  it("creates the collection from the submitted values and announces it", async () => {
    const { onSuccess } = renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "fill valid" }))
    await userEvent.click(screen.getByRole("button", { name: "save" }))

    await waitFor(() => {
      expect(server.create).toHaveBeenCalledTimes(1)
    })
    expect(server.create.mock.calls[0]?.[0]).toStrictEqual({
      descriptions: { "en-US": "", "pl-PL": "" },
      handle: "silver-rings",
      image: "",
      shortDescriptions: { "en-US": "", "pl-PL": "" },
      status: "draft",
      titles: { "en-US": "Silver rings", "pl-PL": "Srebrne pierscionki" },
    })
    expect(toasts.success).toHaveBeenCalledWith("Collection created", { description: "Your collection has been created successfully." })
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
  })

  it("invalidates the storefront, admin and stats collection caches after a create", async () => {
    const { invalidate } = renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "fill valid" }))
    await userEvent.click(screen.getByRole("button", { name: "save" }))

    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledTimes(3)
    })
    expect(invalidate.mock.calls.map((call) => call[0]?.queryKey)).toStrictEqual([
      COLLECTION_QUERY_KEYS.ALL,
      COLLECTION_QUERY_KEYS.ADMIN.ALL,
      COLLECTION_QUERY_KEYS.ADMIN.STATS,
    ])
  })

  it("updates the edited collection by id and announces the save", async () => {
    renderProvider({ mode: "edit", row: collection() })

    await userEvent.click(screen.getByRole("button", { name: "save" }))

    await waitFor(() => {
      expect(server.update).toHaveBeenCalledTimes(1)
    })
    expect(server.update.mock.calls[0]?.[0]).toMatchObject({ handle: "silver-rings", id: "col-1" })
    expect(server.create).not.toHaveBeenCalled()
    expect(toasts.success).toHaveBeenCalledWith("Collection saved", { description: "Your changes have been saved." })
  })

  it("blames the slug field when the server reports a duplicate handle", async () => {
    server.create.mockRejectedValueOnce(new AppError(ERROR_CODES.CONFLICT))
    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "fill valid" }))
    await userEvent.click(screen.getByRole("button", { name: "save" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", {
        description: "A collection with this URL slug already exists.",
      })
    })
    expect(toasts.success).not.toHaveBeenCalled()
  })

  it("falls back to the generic error toast for any other failure", async () => {
    server.create.mockRejectedValueOnce(new Error("network down"))
    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "fill valid" }))
    await userEvent.click(screen.getByRole("button", { name: "save" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", {
        description: "The collection could not be created. Please try again.",
      })
    })
  })

  it("points the admin at the locales still missing a title", async () => {
    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "fill missing title" }))
    await userEvent.click(screen.getByRole("button", { name: "save" }))

    await waitFor(() => {
      expect(locales.focus).toHaveBeenCalledWith(["en-US"])
    })
    expect(toasts.error).toHaveBeenCalledWith("Missing translations", { description: "Fill in the required name for: English." })
    expect(server.create).not.toHaveBeenCalled()
  })

  it("reports a blocked submit when every locale is filled but a field is still invalid", async () => {
    renderProvider()

    await userEvent.click(screen.getByRole("button", { name: "fill invalid handle" }))
    await userEvent.click(screen.getByRole("button", { name: "save" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Fix form errors", { description: "Check highlighted fields and try again." })
    })
    expect(locales.focus).not.toHaveBeenCalled()
    expect(server.create).not.toHaveBeenCalled()
  })
})

describe("CollectionFormProvider lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it("refuses to save an edit that carries no collection to update", async () => {
    renderProvider({ mode: "edit" })

    await userEvent.click(screen.getByRole("button", { name: "fill valid" }))
    await userEvent.click(screen.getByRole("button", { name: "save" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", {
        description: "The collection could not be saved. Please try again.",
      })
    })
    expect(server.update).not.toHaveBeenCalled()
    expect(server.create).not.toHaveBeenCalled()
  })

  it("creates a collection even when no success callback was supplied", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
    const onDismiss = vi.fn<() => void>()

    render(
      <TestProviders queryClient={queryClient} router={createTestRouter()}>
        <CollectionFormProvider collection={undefined} mode="create" onDismiss={onDismiss} open>
          <CollectionForm>
            <FormProbe />
          </CollectionForm>
        </CollectionFormProvider>
      </TestProviders>,
    )

    await userEvent.click(screen.getByRole("button", { name: "fill valid" }))
    await userEvent.click(screen.getByRole("button", { name: "save" }))

    await waitFor(() => {
      expect(toasts.success).toHaveBeenCalledWith("Collection created", { description: "Your collection has been created successfully." })
    })
  })

  it("clears a pending upload once the sheet is closed", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
    const onDismiss = vi.fn<() => void>()
    const tree = (open: boolean): JSX.Element => (
      <TestProviders queryClient={queryClient} router={createTestRouter()}>
        <CollectionFormProvider collection={undefined} mode="create" onDismiss={onDismiss} open={open}>
          <CollectionForm>
            <FormProbe />
          </CollectionForm>
        </CollectionFormProvider>
      </TestProviders>
    )

    const { rerender } = render(tree(true))
    await userEvent.click(screen.getByRole("button", { name: "start upload" }))
    expect(screen.getByRole("status")).toHaveTextContent("create:none:false:true")

    rerender(tree(false))

    expect(screen.getByRole("status")).toHaveTextContent("create:none:false:false")
  })
})

const DismissProbe = (): JSX.Element => {
  const { dismiss } = useCollectionForm()

  return (
    <button type="button" onClick={dismiss}>
      dismiss
    </button>
  )
}

describe("useCollectionForm", () => {
  afterEach(() => {
    cleanup()
  })

  it("refuses to hand out the form context outside its provider", () => {
    expect(() => render(<DismissProbe />)).toThrow("useCollectionForm must be used within CollectionFormProvider")
  })

  it("dismisses the sheet through the context", async () => {
    const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
    const onDismiss = vi.fn<() => void>()

    render(
      <TestProviders queryClient={queryClient} router={createTestRouter()}>
        <CollectionFormProvider collection={undefined} mode="create" onDismiss={onDismiss} open>
          <DismissProbe />
        </CollectionFormProvider>
      </TestProviders>,
    )

    await userEvent.click(screen.getByRole("button", { name: "dismiss" }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
