import { type JSX, useCallback, useState } from "react"

import { cleanup, renderHook, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useWatch } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

const mutations = vi.hoisted(() => ({
  create: vi.fn(() => Promise.resolve({ id: "category-created" })),
  update: vi.fn(() => Promise.resolve({ id: "category-rings" })),
}))

const toasts = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }))

vi.mock("sonner", () => ({ toast: { error: toasts.error, success: toasts.success } }))
vi.mock("~/src/modules/product-category/use-cases/create-category", () => ({ createCategory: mutations.create }))
vi.mock("~/src/modules/product-category/use-cases/update-category", () => ({ updateCategory: mutations.update }))

import {
  CategoryForm,
  CategoryFormProvider,
  useCategoryForm,
} from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider"
import { CategorySheetFooter } from "~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-sheet-footer"
import { CatalogFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"

const EPOCH = new Date("2026-01-01T00:00:00.000Z")

const category = (overrides: Partial<ProductCategory["adminListItem"]> = {}): ProductCategory["adminListItem"] => ({
  createdAt: EPOCH,
  descriptions: null,
  handle: "rings",
  id: "category-rings",
  image: null,
  metadata: null,
  parentId: null,
  productCount: 0,
  rank: 0,
  shortDescriptions: null,
  status: "active",
  subtitles: null,
  titles: { "en-US": "Rings", "pl-PL": "Pierścionki" },
  updatedAt: EPOCH,
  ...overrides,
})

const HandleProbe = (): JSX.Element => {
  const { control } = useCategoryForm()
  const handle = useWatch({ control, name: "handle" })

  return <p data-testid="handle">{handle}</p>
}

const FillButton = ({ handle }: Readonly<{ handle: string }>): JSX.Element => {
  const { setValue } = useCategoryForm()
  const fill = useCallback(() => {
    setValue("handle", handle)
    setValue("titles.en-US", "Rings")
    setValue("titles.pl-PL", "Pierścionki")
  }, [handle, setValue])

  return (
    <button type="button" onClick={fill}>
      {`Fill in ${handle}`}
    </button>
  )
}

const ignoredCallback = vi.fn<() => void>()

const SheetHarness = ({
  handle = "rings",
  mode,
  onSuccess = ignoredCallback,
  row,
}: Readonly<{
  handle?: string
  mode: "create" | "edit"
  onSuccess?: () => void
  row?: ProductCategory["adminListItem"]
}>): JSX.Element => {
  const [open, setOpen] = useState(true)
  const close = useCallback(() => {
    setOpen(false)
  }, [])

  return (
    <CatalogFormLocaleControlsProvider>
      <CategoryFormProvider category={row} mode={mode} onDismiss={ignoredCallback} onSuccess={onSuccess} open={open}>
        <CategoryForm>
          <FillButton handle={handle} />
          <HandleProbe />
        </CategoryForm>
        <CategorySheetFooter />
      </CategoryFormProvider>
      <button type="button" onClick={close}>
        Close the sheet
      </button>
    </CatalogFormLocaleControlsProvider>
  )
}

const EMPTY_LOCALE_MAP = { "en-US": "", "pl-PL": "" }

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(cleanup)

describe("CategoryFormProvider creating a category", () => {
  it("sends the filled form to the create use case", async () => {
    renderWithProviders(<SheetHarness mode="create" />)

    await userEvent.click(screen.getByRole("button", { name: "Fill in rings" }))
    await userEvent.click(screen.getByRole("button", { name: "Create category" }))

    await waitFor(() => {
      expect(mutations.create).toHaveBeenCalledExactlyOnceWith({
        data: {
          descriptions: EMPTY_LOCALE_MAP,
          handle: "rings",
          image: "",
          parentId: "",
          shortDescriptions: EMPTY_LOCALE_MAP,
          status: "draft",
          subtitles: EMPTY_LOCALE_MAP,
          titles: { "en-US": "Rings", "pl-PL": "Pierścionki" },
        },
      })
    })
    expect(mutations.update).not.toHaveBeenCalled()
  })

  it("confirms the new category and tells the sheet it can close", async () => {
    const onSuccess = vi.fn<() => void>()
    renderWithProviders(<SheetHarness mode="create" onSuccess={onSuccess} />)

    await userEvent.click(screen.getByRole("button", { name: "Fill in rings" }))
    await userEvent.click(screen.getByRole("button", { name: "Create category" }))

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledTimes(1)
    })
    expect(toasts.success).toHaveBeenCalledWith("Category created", {
      description: "Your category has been created successfully.",
    })
  })

  it("empties the form again so the next category starts blank", async () => {
    renderWithProviders(<SheetHarness mode="create" />)

    await userEvent.click(screen.getByRole("button", { name: "Fill in rings" }))

    expect(screen.getByTestId("handle")).toHaveTextContent("rings")

    await userEvent.click(screen.getByRole("button", { name: "Create category" }))

    await waitFor(() => {
      expect(screen.getByTestId("handle")).toBeEmptyDOMElement()
    })
  })
})

describe("CategoryFormProvider editing a category", () => {
  it("refuses to save an edit that carries no category id", async () => {
    renderWithProviders(<SheetHarness mode="edit" />)

    await userEvent.click(screen.getByRole("button", { name: "Fill in rings" }))
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Something went wrong", {
        description: "The category could not be saved. Please try again.",
      })
    })
    expect(mutations.update).not.toHaveBeenCalled()
  })

  it("asks for the highlighted fields to be fixed when no language is missing a name", async () => {
    renderWithProviders(<SheetHarness mode="edit" row={category({ handle: "" })} />)

    await userEvent.click(screen.getByRole("button", { name: "Save changes" }))

    await waitFor(() => {
      expect(toasts.error).toHaveBeenCalledWith("Fix form errors", { description: "Check highlighted fields and try again." })
    })
    expect(mutations.update).not.toHaveBeenCalled()
  })
})

describe("CategoryFormProvider closing the sheet", () => {
  it("throws away edits that were never saved", async () => {
    renderWithProviders(<SheetHarness handle="necklaces" mode="edit" row={category()} />)

    await userEvent.click(screen.getByRole("button", { name: "Fill in necklaces" }))

    expect(screen.getByTestId("handle")).toHaveTextContent("necklaces")

    await userEvent.click(screen.getByRole("button", { name: "Close the sheet" }))

    expect(screen.getByTestId("handle")).toHaveTextContent("rings")
  })
})

describe("useCategoryForm", () => {
  it("refuses to run outside the category form provider", () => {
    expect(() => renderHook(() => useCategoryForm())).toThrow("useCategoryForm must be used within CategoryFormProvider")
  })
})
