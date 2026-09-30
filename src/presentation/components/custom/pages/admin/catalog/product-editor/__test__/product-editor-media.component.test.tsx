import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FormProvider, useForm, useWatch } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductFormValues } from "~/src/modules/product/product.zod"

import { type GalleryImage } from "~/src/presentation/components/custom/image-upload/lib/image-upload.types"
import { ProductEditorMedia } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-editor-media"
import { createEmptyProductFormValues } from "~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form.utils"

const productForm = vi.hoisted(() => ({ isPending: false, setUploading: vi.fn<(uploading: boolean) => void>() }))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/product-editor/product-form-provider", () => ({
  useProductForm: () => ({ isPending: productForm.isPending, setUploading: productForm.setUploading }),
}))
vi.mock("~/src/presentation/components/custom/image-upload/components/image-gallery-upload", () => ({
  ImageGalleryUpload: ({
    disabled,
    folder,
    mainId,
    onChange,
    onMainChange,
    onUploadingChange,
    value,
  }: Readonly<{
    disabled: boolean
    folder: string
    mainId: string | undefined
    onChange: (images: readonly GalleryImage[]) => void
    onMainChange: (id: string | undefined) => void
    onUploadingChange: (uploading: boolean) => void
    value: readonly GalleryImage[]
  }>): JSX.Element => (
    <div>
      <output data-testid="gallery-value">{JSON.stringify(value)}</output>
      <output data-testid="gallery-main">{mainId ?? "none"}</output>
      <output data-testid="gallery-folder">{folder}</output>
      <output data-testid="gallery-disabled">{String(disabled)}</output>
      <button
        onClick={() => {
          onChange([
            { id: "img-2", url: "https://cdn.test/two.webp" },
            { id: "img-3", url: "https://cdn.test/three.webp" },
          ])
        }}
        type="button"
      >
        reorder gallery
      </button>
      <button
        onClick={() => {
          onMainChange("img-2")
        }}
        type="button"
      >
        promote second image
      </button>
      <button
        onClick={() => {
          onMainChange(undefined)
        }}
        type="button"
      >
        forget the main image
      </button>
      <button
        onClick={() => {
          onUploadingChange(true)
        }}
        type="button"
      >
        start upload
      </button>
    </div>
  ),
}))

const STORED_IMAGES: ProductFormValues["images"] = [
  { alt: "Silver ring on linen", id: "img-1", url: "https://cdn.test/one.webp" },
  { alt: "Silver ring held up", id: "img-2", url: "https://cdn.test/two.webp" },
]

const MediaHarness = ({
  fillHeight = false,
  values,
}: Readonly<{
  fillHeight?: boolean
  values?: Partial<ProductFormValues>
}>): JSX.Element => {
  const form = useForm<ProductFormValues>({ defaultValues: { ...createEmptyProductFormValues(), ...values } })
  const images = useWatch({ control: form.control, name: "images" })
  const mainImageId = useWatch({ control: form.control, name: "mainImageId" })

  return (
    <FormProvider {...form}>
      <ProductEditorMedia fillHeight={fillHeight} />
      <output data-testid="form-images">{JSON.stringify(images)}</output>
      <output data-testid="form-main">{mainImageId ?? "none"}</output>
    </FormProvider>
  )
}

beforeEach(() => {
  productForm.isPending = false
  productForm.setUploading.mockReset()
})

afterEach(cleanup)

describe("ProductEditorMedia", () => {
  it("fills its grid row when the editor requests an expanded media card", () => {
    renderWithProviders(<MediaHarness fillHeight />)

    expect(screen.getByText("Media").closest('[data-slot="card"]')).toHaveClass("h-full", "flex-col")
  })

  it("titles the media card and explains the accepted files", () => {
    renderWithProviders(<MediaHarness />)

    expect(screen.getByText("Media")).toBeInTheDocument()
    expect(screen.getByText("Supports JPG, PNG, WEBP. Max 5MB.")).toBeInTheDocument()
  })

  it("labels the gallery as the product gallery for a product without variants", () => {
    renderWithProviders(<MediaHarness />)

    expect(screen.getByText("Product gallery")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "First image (or “main”) becomes the catalog thumbnail. Drag to reorder." }),
    ).toBeInTheDocument()
  })

  it("calls the gallery shared and explains the variant fallback once the product has variants", () => {
    renderWithProviders(<MediaHarness values={{ hasVariants: true }} />)

    expect(screen.getByText("Shared photos (optional)")).toBeInTheDocument()
    expect(
      screen.getByRole("button", {
        name: "Shown for every variant that has no gallery of its own. To use different photos per variant, upload them in the Variants section.",
      }),
    ).toBeInTheDocument()
  })

  it("uploads into the products folder", () => {
    renderWithProviders(<MediaHarness />)

    expect(screen.getByTestId("gallery-folder")).toHaveTextContent("products")
  })

  it("shows the stored images in the gallery without their alt text", () => {
    renderWithProviders(<MediaHarness values={{ images: STORED_IMAGES }} />)

    expect(screen.getByTestId("gallery-value")).toHaveTextContent(
      JSON.stringify([
        { id: "img-1", url: "https://cdn.test/one.webp" },
        { id: "img-2", url: "https://cdn.test/two.webp" },
      ]),
    )
  })

  it("marks the stored main image in the gallery", () => {
    renderWithProviders(<MediaHarness values={{ images: STORED_IMAGES, mainImageId: "img-2" }} />)

    expect(screen.getByTestId("gallery-main")).toHaveTextContent("img-2")
  })

  it("keeps the alt text of an image that survives a reorder", async () => {
    renderWithProviders(<MediaHarness values={{ images: STORED_IMAGES }} />)

    await userEvent.click(screen.getByRole("button", { name: "reorder gallery" }))

    expect(screen.getByTestId("form-images")).toHaveTextContent(
      JSON.stringify([
        { alt: "Silver ring held up", id: "img-2", url: "https://cdn.test/two.webp" },
        { alt: "", id: "img-3", url: "https://cdn.test/three.webp" },
      ]),
    )
  })

  it("writes the promoted main image back into the form", async () => {
    renderWithProviders(<MediaHarness values={{ images: STORED_IMAGES, mainImageId: "img-1" }} />)

    await userEvent.click(screen.getByRole("button", { name: "promote second image" }))

    expect(screen.getByTestId("form-main")).toHaveTextContent("img-2")
  })

  it("clears the main image when the gallery no longer has one", async () => {
    renderWithProviders(<MediaHarness values={{ images: STORED_IMAGES, mainImageId: "img-1" }} />)

    await userEvent.click(screen.getByRole("button", { name: "forget the main image" }))

    expect(screen.getByTestId("form-main")).toHaveTextContent("none")
  })

  it("tells the product form while an upload is running", async () => {
    renderWithProviders(<MediaHarness />)

    await userEvent.click(screen.getByRole("button", { name: "start upload" }))

    expect(productForm.setUploading).toHaveBeenCalledWith(true)
  })

  it("locks the gallery while the product is being saved", () => {
    productForm.isPending = true
    renderWithProviders(<MediaHarness />)

    expect(screen.getByTestId("gallery-disabled")).toHaveTextContent("true")
  })

  it("leaves the gallery open while nothing is being saved", () => {
    renderWithProviders(<MediaHarness />)

    expect(screen.getByTestId("gallery-disabled")).toHaveTextContent("false")
  })
})
