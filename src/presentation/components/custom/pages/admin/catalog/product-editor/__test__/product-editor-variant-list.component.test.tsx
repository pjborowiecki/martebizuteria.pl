import { type JSX } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { FormProvider, type UseFormReturn, useForm } from "react-hook-form"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { type GalleryImage } from "~/src/presentation/components/custom/image-upload/lib/image-upload.types"
import { CatalogLocalePickerProvider } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-locale-picker"
import { ProductEditorVariantList } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-variant-list"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

const { attributePanel, setUploading } = vi.hoisted(() => ({ attributePanel: vi.fn(), setUploading: vi.fn() }))

vi.mock("~/src/modules/product-attribute/use-cases/get-admin-product-attributes", () => ({
  getAdminProductAttributesQuery: () => ({
    queryFn: () => Promise.resolve([{ handle: "material", id: "attr-1" }]),
    queryKey: ["admin", "product-attributes"],
  }),
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-attribute-list-panel", () => ({
  ProductEditorAttributeListPanel: (props: { readonly baseName: string }): JSX.Element => {
    attributePanel(props.baseName)

    return <output data-testid="attribute-panel">{props.baseName}</output>
  },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-provider", () => ({
  useProductForm: () => ({ isPending: false, setUploading }),
}))

vi.mock("~/src/presentation/components/custom/image-upload/components/image-gallery-upload", () => ({
  ImageGalleryUpload: ({
    mainId,
    onChange,
    onMainChange,
    onUploadingChange,
    value,
  }: {
    readonly mainId: string | undefined
    readonly onChange: (images: readonly GalleryImage[]) => void
    readonly onMainChange: (id: string | undefined) => void
    readonly onUploadingChange?: (uploading: boolean) => void
    readonly value: readonly GalleryImage[]
  }): JSX.Element => (
    <div>
      <span data-testid="gallery-ids">{value.map((image) => image.id).join(",")}</span>
      <span data-testid="gallery-main">{mainId ?? "none"}</span>
      <button
        onClick={() => {
          onChange([
            { id: "img-1", url: "https://cdn.test/one.webp" },
            { id: "img-new", url: "https://cdn.test/new.webp" },
          ])
        }}
        type="button"
      >
        replace gallery
      </button>
      <button
        onClick={() => {
          onMainChange("img-new")
        }}
        type="button"
      >
        promote main
      </button>
      <button
        onClick={() => {
          onUploadingChange?.(true)
        }}
        type="button"
      >
        start upload
      </button>
    </div>
  ),
}))

afterEach(() => {
  cleanup()
  setUploading.mockClear()
  attributePanel.mockClear()
})

const elementAt = (elements: readonly HTMLElement[], index: number): HTMLElement => {
  const element = elements[index]
  if (element === undefined) {
    throw new Error(`Expected a rendered element at index ${index}`)
  }

  return element
}

const createVariantRow = (overrides: Partial<ProductFormValues["variants"][number]> = {}): ProductFormValues["variants"][number] => ({
  attributeValues: [],
  compareAtPrice: "",
  id: "variant-1",
  images: [],
  manageInventory: true,
  optionValues: {},
  price: "",
  quantity: 0,
  sku: "",
  ...overrides,
})

const VariantListHarness = ({
  onReady,
  values,
}: Readonly<{
  onReady?: (form: UseFormReturn<ProductFormValues>) => void
  values?: Partial<ProductFormValues>
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({
    defaultValues: { ...createEmptyProductFormValues(), hasVariants: true, ...values },
  })
  onReady?.(form)

  return (
    <CatalogLocalePickerProvider activeLocale="en-US">
      <FormProvider {...form}>
        <ProductEditorVariantList />
      </FormProvider>
    </CatalogLocalePickerProvider>
  )
}

const renderVariantList = (values?: Partial<ProductFormValues>) => {
  const seen: { form?: UseFormReturn<ProductFormValues> } = {}

  renderWithProviders(
    <VariantListHarness
      onReady={(form) => {
        seen.form = form
      }}
      {...(values === undefined ? {} : { values })}
    />,
  )

  return seen
}

const NAMED_OPTION = {
  titles: { "en-US": "Variant", "pl-PL": "Wariant" },
  values: [
    { id: "value-1", labels: { "en-US": "Gold plated", "pl-PL": "Złocony" } },
    { id: "value-2", labels: { "en-US": "Silver", "pl-PL": "Srebro" } },
  ],
}

const FIRST_OPTION_VALUE = { id: "value-1", labels: { "en-US": "Gold plated", "pl-PL": "Złocony" } }

const renderTwoRows = () =>
  renderVariantList({ options: [NAMED_OPTION], variants: [createVariantRow(), createVariantRow({ id: "variant-2" })] })

describe("ProductEditorVariantList layout", () => {
  it("names the active locale in the list hint", () => {
    renderVariantList()

    expect(screen.getByText("Variant name in English. Switch PL/EN at the top of the form to add the translation.")).toBeInTheDocument()
  })

  it("renders one blank row when the product has no options yet", () => {
    renderVariantList()

    expect(screen.getAllByRole("textbox", { name: "Variant name (EN)" })).toHaveLength(1)
    expect(screen.getByRole("textbox", { name: "Variant name (EN)" })).toHaveValue("")
  })

  it("keeps an editable row when a draft option has no values or identities yet", async () => {
    const seen = renderVariantList({ options: [{ titles: NAMED_OPTION.titles, values: [] }] })

    await userEvent.type(screen.getByRole("textbox", { name: "Variant name (EN)" }), "New finish")

    expect(seen.form?.getValues("options.0.values.0.labels.en-US")).toBe("New finish")
    expect(screen.getAllByRole("textbox", { name: "Variant name (EN)" })).toHaveLength(1)
  })

  it("falls back to the unnamed label in the row title while the name is blank", () => {
    renderVariantList()

    expect(screen.getByText("Variant: this variant")).toBeInTheDocument()
  })

  it("titles each row with its own variant name", () => {
    renderTwoRows()

    expect(screen.getByText("Variant: Gold plated")).toBeInTheDocument()
    expect(screen.getByText("Variant: Silver")).toBeInTheDocument()
  })

  it("shows the column headers only above the first row", () => {
    renderTwoRows()

    expect(screen.getAllByText("Stock quantity (units)")).toHaveLength(1)
  })

  it("hides the remove control while a single row is left", () => {
    renderVariantList()

    expect(screen.queryByRole("button", { name: "Remove variant" })).toBeNull()
  })

  it("offers a remove control per row once more than one row exists", () => {
    renderTwoRows()

    expect(screen.getAllByRole("button", { name: "Remove variant" })).toHaveLength(2)
  })

  it("labels the variant gallery with the row name", () => {
    renderTwoRows()

    expect(screen.getByText("Photos: Gold plated")).toBeInTheDocument()
  })
})

describe("ProductEditorVariantList row management", () => {
  it("appends an option value and a matching variant row when adding a variant", async () => {
    const seen = renderTwoRows()

    await userEvent.click(screen.getByRole("button", { name: "Add variant" }))

    expect(seen.form?.getValues("options.0.values")).toHaveLength(3)
    expect(seen.form?.getValues("variants")).toHaveLength(3)
    expect(screen.getAllByRole("textbox", { name: "Variant name (EN)" })).toHaveLength(3)
  })

  it("seeds the implicit option when the product has no option yet", async () => {
    const seen = renderVariantList({ variants: [createVariantRow()] })

    await userEvent.click(screen.getByRole("button", { name: "Add variant" }))

    expect(seen.form?.getValues("options.0.titles")).toStrictEqual({ "en-US": "Variant", "pl-PL": "Wariant" })
    expect(seen.form?.getValues("options.0.values")).toHaveLength(2)
    expect(seen.form?.getValues("variants")).toHaveLength(2)
  })

  it("removes the targeted row and regenerates the variant rows", async () => {
    const seen = renderTwoRows()

    await userEvent.click(elementAt(screen.getAllByRole("button", { name: "Remove variant" }), 1))

    expect(seen.form?.getValues("options.0.values")).toHaveLength(1)
    expect(seen.form?.getValues("options.0.values.0.labels.en-US")).toBe("Gold plated")
    expect(seen.form?.getValues("variants")).toHaveLength(1)
  })

  it("replaces the last removed row with a fresh blank value", async () => {
    const seen = renderVariantList({
      options: [{ ...NAMED_OPTION, values: [FIRST_OPTION_VALUE] }],
      variants: [createVariantRow()],
    })

    await userEvent.click(screen.getByRole("button", { name: "Add variant" }))
    await userEvent.click(elementAt(screen.getAllByRole("button", { name: "Remove variant" }), 0))

    const values = seen.form?.getValues("options.0.values")
    expect(values).toHaveLength(1)
    expect(values?.[0]?.labels["en-US"]).toBe("")
  })
})

describe("ProductEditorVariantList field writes", () => {
  it("writes the typed name into the active locale label", async () => {
    const seen = renderTwoRows()

    await userEvent.type(elementAt(screen.getAllByRole("textbox", { name: "Variant name (EN)" }), 0), "!")

    expect(seen.form?.getValues("options.0.values.0.labels.en-US")).toBe("Gold plated!")
    expect(seen.form?.getValues("options.0.values.0.labels.pl-PL")).toBe("Złocony")
  })

  it("stores the SKU typed into a row", async () => {
    const seen = renderTwoRows()

    await userEvent.type(elementAt(screen.getAllByRole("textbox", { name: "SKU" }), 0), "MA-001")

    expect(seen.form?.getValues("variants.0.sku")).toBe("MA-001")
  })

  it("stores the price entered through the money input", async () => {
    const seen = renderTwoRows()

    await userEvent.type(elementAt(screen.getAllByRole("textbox", { name: "Price" }), 0), "129")
    await userEvent.tab()

    expect(seen.form?.getValues("variants.0.price")).toBe("129.00")
  })

  it("stores the committed stock quantity", async () => {
    const seen = renderTwoRows()

    await userEvent.type(elementAt(screen.getAllByRole("textbox", { name: "Stock quantity (units)" }), 0), "7")
    await userEvent.tab()

    expect(seen.form?.getValues("variants.0.quantity")).toBe(7)
  })
})

describe("ProductEditorVariantList gallery and attributes", () => {
  it("renders the existing variant gallery and its main image", () => {
    renderVariantList({
      options: [NAMED_OPTION],
      variants: [
        createVariantRow({ images: [{ alt: "front", id: "img-1", url: "https://cdn.test/one.webp" }], mainImageId: "img-1" }),
        createVariantRow({ id: "variant-2" }),
      ],
    })

    expect(elementAt(screen.getAllByTestId("gallery-ids"), 0)).toHaveTextContent("img-1")
    expect(elementAt(screen.getAllByTestId("gallery-main"), 0)).toHaveTextContent("img-1")
  })

  it("keeps the alt text of images that survive a gallery replacement", async () => {
    const seen = renderVariantList({
      options: [NAMED_OPTION],
      variants: [
        createVariantRow({ images: [{ alt: "front", id: "img-1", url: "https://cdn.test/one.webp" }] }),
        createVariantRow({ id: "variant-2" }),
      ],
    })

    await userEvent.click(elementAt(screen.getAllByRole("button", { name: "replace gallery" }), 0))

    expect(seen.form?.getValues("variants.0.images")).toStrictEqual([
      { alt: "front", id: "img-1", url: "https://cdn.test/one.webp" },
      { alt: "", id: "img-new", url: "https://cdn.test/new.webp" },
    ])
  })

  it("stores a gallery for a row that has no saved variant yet", async () => {
    const seen = renderVariantList({ options: [NAMED_OPTION], variants: [createVariantRow()] })

    await userEvent.click(elementAt(screen.getAllByRole("button", { name: "replace gallery" }), 1))

    expect(seen.form?.getValues("variants.1.images")).toStrictEqual([
      { alt: "", id: "img-1", url: "https://cdn.test/one.webp" },
      { alt: "", id: "img-new", url: "https://cdn.test/new.webp" },
    ])
  })

  it("stores the promoted main image id", async () => {
    const seen = renderTwoRows()

    await userEvent.click(elementAt(screen.getAllByRole("button", { name: "promote main" }), 0))

    expect(seen.form?.getValues("variants.0.mainImageId")).toBe("img-new")
  })

  it("forwards gallery upload progress to the product form", async () => {
    renderTwoRows()

    await userEvent.click(elementAt(screen.getAllByRole("button", { name: "start upload" }), 0))

    expect(setUploading).toHaveBeenCalledWith(true)
  })

  it("mounts the attribute panel for each row under its own field path", async () => {
    renderTwoRows()

    await waitFor(() => {
      expect(screen.getAllByTestId("attribute-panel")).toHaveLength(2)
    })
    expect(attributePanel).toHaveBeenCalledWith("variants.0.attributeValues")
    expect(attributePanel).toHaveBeenCalledWith("variants.1.attributeValues")
  })

  it("defaults a missing attribute value list to an empty array", async () => {
    const seen = renderVariantList({
      options: [NAMED_OPTION],
      variants: [createVariantRow({ attributeValues: undefined }), createVariantRow({ id: "variant-2" })],
    })

    await waitFor(() => {
      expect(seen.form?.getValues("variants.0.attributeValues")).toStrictEqual([])
    })
  })
})
