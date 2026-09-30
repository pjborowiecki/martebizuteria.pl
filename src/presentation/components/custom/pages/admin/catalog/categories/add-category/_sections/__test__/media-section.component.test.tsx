import { type JSX } from "react"

import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { useForm } from "react-hook-form"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCategory } from "~/src/modules/product-category/product-category.types"

const { categoryForm, uploadProps } = vi.hoisted(() => ({
  categoryForm: { isPending: false, setUploading: vi.fn<(uploading: boolean) => void>() },
  uploadProps: {
    current: undefined as
      | undefined
      | Readonly<{
          disabled: boolean
          folder: string
          invalid: boolean
          onChange: (url: string) => void
          onUploadingChange: (uploading: boolean) => void
          value: string | undefined
        }>,
  },
}))

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/category-form-provider", () => ({
  useCategoryForm: () => categoryForm,
}))
vi.mock("~/src/presentation/components/custom/image-upload/components/image-upload", () => ({
  ImageUpload: (
    props: Readonly<{
      disabled: boolean
      folder: string
      invalid: boolean
      onChange: (url: string) => void
      onUploadingChange: (uploading: boolean) => void
      value: string
    }>,
  ) => {
    uploadProps.current = props

    return (
      <>
        <button
          type="button"
          onClick={() => {
            props.onUploadingChange(true)
          }}
        >
          start image upload
        </button>
        <button
          type="button"
          onClick={() => {
            props.onChange("categories/aurora.jpg")
            props.onUploadingChange(false)
          }}
        >
          upload image
        </button>
      </>
    )
  },
}))

const { MediaSection } =
  await import("~/src/presentation/components/custom/pages/admin/catalog/categories/add-category/_sections/media-section")

const IMAGE_TEST_ID = "image-value"

const MediaSectionHarness = ({ image = "" }: Readonly<{ image?: string }>): JSX.Element => {
  const form = useForm<ProductCategory["formValues"]>({ defaultValues: { image } })
  Object.assign(categoryForm, { control: form.control, isPending: categoryForm.isPending, setUploading: categoryForm.setUploading })
  const currentImage = form.watch("image")

  return (
    <>
      <MediaSection />
      <p data-testid={IMAGE_TEST_ID}>{currentImage}</p>
    </>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  categoryForm.isPending = false
  uploadProps.current = undefined
})

afterEach(() => {
  cleanup()
})

describe("MediaSection", () => {
  it("heads the section with the translated media title", () => {
    renderWithProviders(<MediaSectionHarness />)

    expect(screen.getByText("Media")).toBeInTheDocument()
  })

  it("labels the image field and explains what the image is used for", () => {
    renderWithProviders(<MediaSectionHarness />)

    expect(screen.getByText("Image")).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Hero or thumbnail image for this category in the storefront and admin." }),
    ).toBeInTheDocument()
  })

  it("uploads into the categories folder", () => {
    renderWithProviders(<MediaSectionHarness />)

    expect(uploadProps.current?.folder).toBe("categories")
  })

  it("shows the image the form already holds", () => {
    renderWithProviders(<MediaSectionHarness image="categories/existing.jpg" />)

    expect(uploadProps.current?.value).toBe("categories/existing.jpg")
  })

  it("stores the uploaded url on the form field", async () => {
    renderWithProviders(<MediaSectionHarness />)

    await userEvent.click(screen.getByRole("button", { name: "upload image" }))

    expect(screen.getByTestId(IMAGE_TEST_ID)).toHaveTextContent("categories/aurora.jpg")
  })

  it("blocks the upload while the form is saving", () => {
    categoryForm.isPending = true
    renderWithProviders(<MediaSectionHarness />)

    expect(uploadProps.current?.disabled).toBe(true)
  })

  it("reports the upload progress to the form so it can wait for it", async () => {
    renderWithProviders(<MediaSectionHarness />)

    await userEvent.click(screen.getByRole("button", { name: "start image upload" }))

    expect(categoryForm.setUploading).toHaveBeenNthCalledWith(1, true)

    await userEvent.click(screen.getByRole("button", { name: "upload image" }))

    expect(categoryForm.setUploading).toHaveBeenNthCalledWith(2, false)
    expect(screen.getByTestId(IMAGE_TEST_ID)).toHaveTextContent("categories/aurora.jpg")
  })

  it("leaves the field valid before it has been touched", () => {
    renderWithProviders(<MediaSectionHarness />)

    expect(uploadProps.current?.invalid).toBe(false)
  })
})
