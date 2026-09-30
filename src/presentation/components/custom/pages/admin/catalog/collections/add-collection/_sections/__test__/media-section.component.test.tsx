import { type JSX } from "react"

import { cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { type Control, useForm, useWatch } from "react-hook-form"
import { type Mock, afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { type ProductCollection } from "~/src/modules/product-collection/product-collection.types"

type CollectionFormValues = ProductCollection["formValues"]

const { form, setUploading, uploadFiles } = vi.hoisted(
  (): {
    form: { control?: Control<CollectionFormValues>; isPending: boolean }
    setUploading: Mock<(uploading: boolean) => void>
    uploadFiles: Mock<(files: readonly File[]) => Promise<string[]>>
  } => ({ form: { isPending: false }, setUploading: vi.fn(), uploadFiles: vi.fn() }),
)

vi.mock("~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/collection-form-provider", () => ({
  useCollectionForm: () => ({ control: form.control, isPending: form.isPending, setUploading }),
}))
vi.mock("~/src/presentation/components/custom/image-upload/hooks/use-image-upload", () => ({
  useImageUpload: () => ({ isUploading: false, uploadFiles }),
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: Readonly<{ alt: string; src: string }>) => <img alt={alt} src={src} />,
}))

import { MediaSection } from "~/src/presentation/components/custom/pages/admin/catalog/collections/add-collection/_sections/media-section"

afterEach(cleanup)

const defaults = (image: string): CollectionFormValues => ({
  descriptions: { "en-US": "", "pl-PL": "" },
  handle: "nowosci",
  image,
  shortDescriptions: { "en-US": "", "pl-PL": "" },
  status: "draft",
  titles: { "en-US": "New arrivals", "pl-PL": "Nowości" },
})

const MediaHarness = ({ image = "" }: Readonly<{ image?: string }>): JSX.Element => {
  const { control } = useForm<CollectionFormValues>({ defaultValues: defaults(image) })
  form.control = control
  const current = useWatch({ control, name: "image" })

  return (
    <div>
      <MediaSection />
      <output data-testid="image">{current}</output>
    </div>
  )
}

const fileInput = (container: HTMLElement): HTMLInputElement => {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (input === null) {
    throw new Error("expected a hidden file input")
  }

  return input
}

beforeEach(() => {
  form.isPending = false
  setUploading.mockReset()
  uploadFiles.mockReset()
  uploadFiles.mockResolvedValue(["https://cdn.test/collections/cover.png"])
  vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:preview", revokeObjectURL: vi.fn<(url: string) => void>() })
})

describe("MediaSection", () => {
  it("titles the section and labels the cover image field", () => {
    renderWithProviders(<MediaHarness />)

    expect(screen.getByText("Media")).toBeInTheDocument()
    expect(screen.getByText("Cover Image")).toBeInTheDocument()
    expect(screen.getByLabelText("Cover image used on the collection page and in listings.")).toBeInTheDocument()
  })

  it("offers the dropzone while the collection has no cover", () => {
    renderWithProviders(<MediaHarness />)

    expect(screen.getByRole("button", { name: /Click to upload or drag and drop/u })).toBeInTheDocument()
  })

  it("shows the cover the collection already has", () => {
    const { container } = renderWithProviders(<MediaHarness image="https://cdn.test/collections/existing.webp" />)

    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.test/collections/existing.webp")
  })

  it("stores the uploaded cover url on the form", async () => {
    const { container } = renderWithProviders(<MediaHarness />)

    await userEvent.upload(fileInput(container), new File(["binary"], "cover.png", { type: "image/png" }))

    await waitFor(() => {
      expect(screen.getByTestId("image")).toHaveTextContent("https://cdn.test/collections/cover.png")
    })
  })

  it("blocks uploads while the collection is being saved", () => {
    form.isPending = true
    renderWithProviders(<MediaHarness />)

    expect(screen.getByRole("button", { name: /Click to upload or drag and drop/u })).toBeDisabled()
  })
})
