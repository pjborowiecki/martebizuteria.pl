import { type JSX, type ReactNode } from "react"

import { QueryClient } from "@tanstack/react-query"
import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useFormContext } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

const { createCompleteProduct, setAllProductAttributes, toastError, toastSuccess, updateCompleteProduct, validateProductSkus } = vi.hoisted(
  () => ({
    createCompleteProduct: vi.fn(),
    setAllProductAttributes: vi.fn(),
    toastError: vi.fn(),
    toastSuccess: vi.fn(),
    updateCompleteProduct: vi.fn(),
    validateProductSkus: vi.fn(),
  }),
)

vi.mock("sonner", () => ({ toast: { error: toastError, success: toastSuccess } }))
vi.mock("~/src/modules/product/use-cases/create-complete-product", () => ({ createCompleteProduct }))
vi.mock("~/src/modules/product/use-cases/update-complete-product", () => ({ updateCompleteProduct }))
vi.mock("~/src/modules/product/use-cases/validate-product-skus", () => ({ validateProductSkus }))
vi.mock("~/src/modules/attribute-on-product/use-cases/set-all-product-attributes", () => ({ setAllProductAttributes }))

import { ATTRIBUTE_ON_PRODUCT_QUERY_KEYS } from "~/src/modules/attribute-on-product/attribute-on-product.constants"
import { PRODUCT_IMAGE_QUERY_KEYS } from "~/src/modules/product-image/product-image.constants"
import { PRODUCT_ADMIN_STATUS, PRODUCT_ERROR_CODES, PRODUCT_QUERY_KEYS } from "~/src/modules/product/product.constants"
import { type AdminProductDetail } from "~/src/modules/product/product.utils"
import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { CatalogFormLocaleControlsProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-form-locale-controls"
import {
  PRODUCT_FORM_ID,
  ProductForm,
  ProductFormProvider,
  useProductForm,
} from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-provider"
import { regenerateVariantRows } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

afterEach(cleanup)

const PRIMARY_CATEGORY_ID = "0195b6f4-0000-7000-8000-000000000001"

const PRODUCT_ID = "0195b6f4-0000-7000-8000-000000000009"

const AT = new Date("2026-01-01T00:00:00.000Z")

const DUPLICATE_HANDLE_MESSAGE =
  "This URL slug is already used by another product. If it is not in the list, click Create product again \u2014 the previous attempt may have been rolled back."

const locales = (value: string): { "en-US": string; "pl-PL": string } => ({ "en-US": value, "pl-PL": value })

const formValues = (overrides: Partial<ProductFormValues> = {}): ProductFormValues => ({
  additionalCategoryIds: [],
  attributeValues: [],
  collectionIds: [],
  descriptions: locales(""),
  handle: "srebrny-pierscionek",
  hasVariants: false,
  images: [],
  mainImageId: undefined,
  options: [],
  primaryCategoryId: PRIMARY_CATEGORY_ID,
  simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 5, sku: "" },
  status: PRODUCT_ADMIN_STATUS.DRAFT,
  subtitles: locales(""),
  tags: { "en-US": [], "pl-PL": [] },
  titles: locales("Silver ring"),
  variants: [],
  ...overrides,
})

const productDetail = (): AdminProductDetail => ({
  attributes: [],
  categories: [],
  collections: [],
  createdAt: AT,
  descriptions: null,
  handle: "srebrny-pierscionek",
  id: PRODUCT_ID,
  images: [],
  metadata: null,
  options: [],
  primaryCategoryId: PRIMARY_CATEGORY_ID,
  rank: 0,
  status: "draft",
  subtitles: null,
  tags: null,
  thumbnail: null,
  titles: { "en-US": "Silver ring", "pl-PL": "Srebrny pierścionek" },
  updatedAt: AT,
  variants: [],
})

const Probe = (): JSX.Element => {
  const { dismiss, isPending, isUploading, mode, productId, setUploading } = useProductForm()
  const { formState } = useFormContext<ProductFormValues>()

  return (
    <div>
      <output data-testid="mode">{mode}</output>
      <output data-testid="product-id">{productId ?? "none"}</output>
      <output data-testid="pending">{String(isPending)}</output>
      <output data-testid="uploading">{String(isUploading)}</output>
      <output data-testid="handle-error">{formState.errors.handle?.message ?? "none"}</output>
      <output data-testid="first-sku-error">{formState.errors.variants?.[0]?.sku?.message ?? "none"}</output>
      <output data-testid="second-sku-error">{formState.errors.variants?.[1]?.sku?.message ?? "none"}</output>
      <button onClick={dismiss} type="button">
        dismiss
      </button>
      <button
        onClick={() => {
          setUploading(true)
        }}
        type="button"
      >
        start upload
      </button>
    </div>
  )
}

const Seed = ({ values }: Readonly<{ values: ProductFormValues }>): JSX.Element => {
  const { reset } = useFormContext<ProductFormValues>()

  return (
    <button
      data-testid="seed"
      onClick={() => {
        reset(values)
      }}
      type="button"
    >
      seed
    </button>
  )
}

const Harness = ({
  children,
  onDismiss = vi.fn<() => void>(),
  onSuccess,
  open = true,
  values = formValues(),
}: Readonly<{
  children?: ReactNode
  onDismiss?: () => void
  onSuccess?: () => void
  open?: boolean
  values?: ProductFormValues
}>): JSX.Element => (
  <CatalogFormLocaleControlsProvider>
    <ProductFormProvider mode="create" onDismiss={onDismiss} {...(onSuccess === undefined ? {} : { onSuccess })} open={open}>
      <Seed values={values} />
      <ProductForm>
        {children}
        <button type="submit">Save</button>
      </ProductForm>
      <Probe />
    </ProductFormProvider>
  </CatalogFormLocaleControlsProvider>
)

const EditHarness = ({ values = formValues() }: Readonly<{ values?: ProductFormValues }>): JSX.Element => (
  <CatalogFormLocaleControlsProvider>
    <ProductFormProvider initialProduct={productDetail()} mode="edit" onDismiss={vi.fn<() => void>()} open>
      <Seed values={values} />
      <ProductForm>
        <button type="submit">Save</button>
      </ProductForm>
      <Probe />
    </ProductFormProvider>
  </CatalogFormLocaleControlsProvider>
)

const testQueryClient = () => new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })

const seedAndSave = async () => {
  await userEvent.click(screen.getByTestId("seed"))
  await userEvent.click(screen.getByRole("button", { name: "Save" }))
}

const submit = async (values: ProductFormValues = formValues()) => {
  renderWithProviders(<Harness values={values} />)
  await seedAndSave()
}

beforeEach(() => {
  createCompleteProduct.mockReset()
  updateCompleteProduct.mockReset()
  validateProductSkus.mockReset()
  setAllProductAttributes.mockReset()
  toastError.mockReset()
  toastSuccess.mockReset()
  createCompleteProduct.mockResolvedValue({ handle: "srebrny-pierscionek", id: "prod-1" })
  updateCompleteProduct.mockResolvedValue({ handle: "srebrny-pierscionek", id: PRODUCT_ID })
  validateProductSkus.mockResolvedValue({ takenSkus: [] })
  setAllProductAttributes.mockResolvedValue(undefined)
})

describe("useProductForm", () => {
  it("refuses to hand out context outside the provider", () => {
    expect(() => renderWithProviders(<Probe />)).toThrow("useProductForm must be used within ProductFormProvider")
  })
})

describe("ProductFormProvider context", () => {
  it("publishes the mode and the absence of a product id in create mode", () => {
    renderWithProviders(<Harness />)

    expect(screen.getByTestId("mode")).toHaveTextContent("create")
    expect(screen.getByTestId("product-id")).toHaveTextContent("none")
    expect(screen.getByTestId("pending")).toHaveTextContent("false")
    expect(screen.getByTestId("uploading")).toHaveTextContent("false")
  })

  it("lets a child flip the uploading flag", async () => {
    renderWithProviders(<Harness />)

    await userEvent.click(screen.getByRole("button", { name: "start upload" }))

    expect(screen.getByTestId("uploading")).toHaveTextContent("true")
  })

  it("clears the uploading flag and notifies the caller on dismiss", async () => {
    const onDismiss = vi.fn<() => void>()
    renderWithProviders(<Harness onDismiss={onDismiss} />)
    await userEvent.click(screen.getByRole("button", { name: "start upload" }))

    await userEvent.click(screen.getByRole("button", { name: "dismiss" }))

    expect(onDismiss).toHaveBeenCalledTimes(1)
    expect(screen.getByTestId("uploading")).toHaveTextContent("false")
  })

  it("resets the uploading flag while the sheet is closed", () => {
    renderWithProviders(<Harness open={false} />)

    expect(screen.getByTestId("uploading")).toHaveTextContent("false")
  })
})

describe("ProductForm", () => {
  it("renders a no-validate form carrying the shared submit id", () => {
    const { container } = renderWithProviders(<Harness />)
    const form = container.querySelector("form")

    expect(form).toHaveAttribute("id", PRODUCT_FORM_ID)
    expect(form).toHaveAttribute("novalidate")
  })
})

describe("ProductFormProvider invalid submissions", () => {
  it("reports the locales missing a name instead of a generic form error", async () => {
    await submit(formValues({ titles: locales("") }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Missing translations", {
        description: "Fill in the required name for: Polish, English.",
      })
    })
    expect(createCompleteProduct).not.toHaveBeenCalled()
  })

  it("falls back to the blocked-submit toast when every name is filled", async () => {
    await submit(formValues({ handle: "Not A Slug" }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Fix form errors", {
        description: "Check highlighted fields and try again.",
      })
    })
    expect(createCompleteProduct).not.toHaveBeenCalled()
  })
})

describe("ProductFormProvider create submissions", () => {
  it("creates the product, persists attribute values and announces success", async () => {
    const onSuccess = vi.fn<() => void>()
    renderWithProviders(<Harness onSuccess={onSuccess} />)

    await seedAndSave()

    await waitFor(() => {
      expect(createCompleteProduct).toHaveBeenCalledTimes(1)
    })
    expect(createCompleteProduct.mock.calls[0]?.[0]).toMatchObject({
      data: { attributeValues: [], handle: "srebrny-pierscionek", images: [], primaryCategoryId: PRIMARY_CATEGORY_ID },
    })
    expect(setAllProductAttributes).toHaveBeenCalledWith({
      data: { productId: "prod-1", productValues: [], variantValues: [] },
    })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Product created", { description: "The product was added to your catalog." })
    })
    expect(onSuccess).toHaveBeenCalledTimes(1)
    expect(updateCompleteProduct).not.toHaveBeenCalled()
  })

  it("always persists inventory tracking for the simple variant", async () => {
    await submit()

    await waitFor(() => {
      expect(createCompleteProduct).toHaveBeenCalledTimes(1)
    })
    expect(createCompleteProduct.mock.calls[0]?.[0]).toMatchObject({
      data: { simpleVariant: { manageInventory: true, price: "120.00", quantity: 5 } },
    })
  })

  it("skips sku validation when no sku was entered", async () => {
    await submit()

    await waitFor(() => {
      expect(createCompleteProduct).toHaveBeenCalledTimes(1)
    })
    expect(validateProductSkus).not.toHaveBeenCalled()
  })

  it("validates entered skus without a product id in create mode", async () => {
    await submit(formValues({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 5, sku: "SKU-1" } }))

    await waitFor(() => {
      expect(validateProductSkus).toHaveBeenCalledWith({ data: { productId: undefined, skus: ["SKU-1"] } })
    })
    await waitFor(() => {
      expect(createCompleteProduct).toHaveBeenCalledTimes(1)
    })
  })

  it("invalidates the admin product caches for the saved handle and id", async () => {
    const queryClient = testQueryClient()
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue(undefined)
    renderWithProviders(<Harness />, { queryClient })

    await seedAndSave()

    await waitFor(() => {
      expect(invalidateQueries).toHaveBeenCalledTimes(5)
    })
    expect(invalidateQueries.mock.calls.map((call) => call[0]?.queryKey)).toStrictEqual([
      PRODUCT_QUERY_KEYS.ADMIN.ALL,
      [...PRODUCT_QUERY_KEYS.ADMIN.BY_HANDLE, "srebrny-pierscionek"],
      [...PRODUCT_QUERY_KEYS.ADMIN.PAGE],
      [...PRODUCT_IMAGE_QUERY_KEYS.BY_PRODUCT_ID, "prod-1"],
      [...ATTRIBUTE_ON_PRODUCT_QUERY_KEYS.BY_PRODUCT_ID, "prod-1"],
    ])
  })
})

describe("ProductFormProvider edit submissions", () => {
  it("updates the existing product and announces the saved copy", async () => {
    renderWithProviders(<EditHarness />)

    await seedAndSave()

    await waitFor(() => {
      expect(updateCompleteProduct).toHaveBeenCalledTimes(1)
    })
    expect(updateCompleteProduct.mock.calls[0]?.[0]).toMatchObject({
      data: { attributeValues: [], id: PRODUCT_ID, images: [], variantAttributeValues: [] },
    })
    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Product saved", { description: "Your changes have been saved." })
    })
    expect(createCompleteProduct).not.toHaveBeenCalled()
    expect(setAllProductAttributes).not.toHaveBeenCalled()
  })

  it("scopes sku validation to the product being edited", async () => {
    renderWithProviders(
      <EditHarness
        values={formValues({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 5, sku: "SKU-9" } })}
      />,
    )

    await seedAndSave()

    await waitFor(() => {
      expect(validateProductSkus).toHaveBeenCalledWith({ data: { productId: PRODUCT_ID, skus: ["SKU-9"] } })
    })
  })

  it("publishes the edited product id through the context", () => {
    renderWithProviders(<EditHarness />)

    expect(screen.getByTestId("mode")).toHaveTextContent("edit")
    expect(screen.getByTestId("product-id")).toHaveTextContent(PRODUCT_ID)
  })
})

describe("ProductFormProvider mutation error handling", () => {
  const onSuccess = vi.fn<() => void>()

  const failInvalidation = async (error: unknown) => {
    const queryClient = testQueryClient()
    vi.spyOn(queryClient, "invalidateQueries").mockRejectedValue(error)
    renderWithProviders(<Harness onSuccess={onSuccess} />, { queryClient })
    await seedAndSave()
    await waitFor(() => {
      expect(createCompleteProduct).toHaveBeenCalledTimes(1)
    })
  }

  beforeEach(() => {
    onSuccess.mockReset()
  })

  it("writes a duplicate handle onto the handle field and raises the slug toast", async () => {
    await failInvalidation(new Error(PRODUCT_ERROR_CODES.DUPLICATE_HANDLE))

    await waitFor(() => {
      expect(screen.getByTestId("handle-error")).toHaveTextContent(DUPLICATE_HANDLE_MESSAGE)
    })
    expect(toastError).toHaveBeenCalledWith("Could not save product", { description: DUPLICATE_HANDLE_MESSAGE })
    expect(toastSuccess).not.toHaveBeenCalled()
    expect(onSuccess).not.toHaveBeenCalled()
  })

  it("reports a duplicate sku without touching the handle field", async () => {
    await failInvalidation(new Error("UNIQUE constraint failed: product_variant.sku"))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not save product", { description: "This SKU is already used by another variant." })
    })
    expect(screen.getByTestId("handle-error")).toHaveTextContent("none")
    expect(toastError).toHaveBeenCalledTimes(1)
  })

  it("recognizes the unique index behind a duplicate attribute assignment", async () => {
    await failInvalidation(new Error("D1_ERROR: UNIQUE constraint failed: attribute_on_product_product_attribute_uidx"))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not save product", {
        description: "The same attribute cannot be assigned to a product more than once.",
      })
    })
  })

  it("tells the operator to run migrations when a column is missing", async () => {
    await failInvalidation(new Error("no such column: titles"))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not save product", {
        description: "The database schema is out of date. Run migrations: bun run db:migrate",
      })
    })
  })

  it("surfaces the innermost cause of a wrapped failure", async () => {
    await failInvalidation(new Error("outer", { cause: new Error("D1_ERROR: disk is full") }))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not save product", { description: "D1_ERROR: disk is full" })
    })
  })

  it("falls back to the generic description when the failure carries no message", async () => {
    await failInvalidation("not an error object")

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not save product", { description: "Check the form and try again." })
    })
  })

  it("treats an aborted invalidation as success rather than a failure", async () => {
    await failInvalidation(new DOMException("aborted", "AbortError"))

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledWith("Product created", { description: "The product was added to your catalog." })
    })
    expect(toastError).not.toHaveBeenCalled()
    expect(onSuccess).toHaveBeenCalledTimes(1)
  })

  it("treats a cancelled query as success rather than a failure", async () => {
    await failInvalidation(new Error("CancelledError"))

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledTimes(1)
    })
    expect(toastError).not.toHaveBeenCalled()
  })

  it("treats a rejection named through the error name as a cancellation", async () => {
    const aborted = new Error("request aborted")
    aborted.name = "AbortError"

    await failInvalidation(aborted)

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledTimes(1)
    })
    expect(toastError).not.toHaveBeenCalled()
  })
})

const skuValues = (sku: string): ProductFormValues =>
  formValues({ simpleVariant: { compareAtPrice: "", manageInventory: true, price: "120.00", quantity: 5, sku } })

const OrphanEditHarness = (): JSX.Element => (
  <CatalogFormLocaleControlsProvider>
    <ProductFormProvider mode="edit" onDismiss={vi.fn<() => void>()} open>
      <Seed values={formValues()} />
      <ProductForm>
        <button type="submit">Save</button>
      </ProductForm>
      <Probe />
    </ProductFormProvider>
  </CatalogFormLocaleControlsProvider>
)

describe("ProductFormProvider sku conflicts", () => {
  it("marks only the conflicting SKU when the other variant SKU is available", async () => {
    const options = [{ id: "size", titles: locales("Size"), values: [{ labels: locales("Small") }, { labels: locales("Large") }] }]
    const variants = regenerateVariantRows(options, []).map((row, index) =>
      Object.assign(row, { price: "120.00", sku: index === 0 ? "SKU-TAKEN" : "SKU-FREE" }),
    )
    validateProductSkus.mockResolvedValue({ takenSkus: ["SKU-TAKEN"] })

    await submit(formValues({ hasVariants: true, options, variants }))

    await waitFor(() => {
      expect(screen.getByTestId("first-sku-error")).toHaveTextContent("form.validation.duplicateSku")
    })
    expect(screen.getByTestId("second-sku-error")).toHaveTextContent("none")
    expect(validateProductSkus).toHaveBeenCalledWith({ data: { productId: undefined, skus: ["SKU-TAKEN", "SKU-FREE"] } })
    expect(createCompleteProduct).not.toHaveBeenCalled()
  })

  it("refuses to save a sku another variant already uses", async () => {
    validateProductSkus.mockResolvedValue({ takenSkus: ["SKU-1"] })

    await submit(skuValues("SKU-1"))

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledWith("Could not save product", { description: "This SKU is already used by another variant." })
    })
    expect(createCompleteProduct).not.toHaveBeenCalled()
  })
})

describe("ProductFormProvider edit mode without a product", () => {
  it("writes nothing and reports the failure when there is no product to update", async () => {
    renderWithProviders(<OrphanEditHarness />)

    await seedAndSave()

    await waitFor(() => {
      expect(toastError).toHaveBeenCalledTimes(1)
    })
    expect(toastError.mock.calls[0]?.[0]).toBe("Could not save product")
    expect(updateCompleteProduct).not.toHaveBeenCalled()
    expect(createCompleteProduct).not.toHaveBeenCalled()
  })
})

describe("ProductFormProvider repeated submissions", () => {
  it("ignores a second save while the first one is still running", async () => {
    createCompleteProduct.mockImplementation(() => new Promise(() => {}))
    renderWithProviders(<Harness />)

    await seedAndSave()
    await waitFor(() => {
      expect(createCompleteProduct).toHaveBeenCalledTimes(1)
    })
    await userEvent.click(screen.getByRole("button", { name: "Save" }))

    expect(createCompleteProduct).toHaveBeenCalledTimes(1)
  })

  it("treats an aborted save as neither a success nor a failure and lets the next one through", async () => {
    createCompleteProduct.mockRejectedValueOnce(new DOMException("aborted", "AbortError"))
    renderWithProviders(<Harness />)

    await seedAndSave()
    await waitFor(() => {
      expect(createCompleteProduct).toHaveBeenCalledTimes(1)
    })
    await userEvent.click(screen.getByRole("button", { name: "Save" }))

    await waitFor(() => {
      expect(toastSuccess).toHaveBeenCalledTimes(1)
    })
    expect(toastError).not.toHaveBeenCalled()
  })
})
