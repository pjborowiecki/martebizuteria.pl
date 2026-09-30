import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ImageGalleryUpload } from "~/src/presentation/components/custom/image-upload/components/image-gallery-upload"
import { type GalleryImage } from "~/src/presentation/components/custom/image-upload/lib/image-upload.types"

const upload = vi.hoisted(() => ({
  isUploading: { current: false },
  uploadFiles: vi.fn((files: readonly File[]) => Promise.resolve(files.map((file) => `https://cdn.example.test/${file.name}`))),
}))

vi.mock("~/src/presentation/components/custom/image-upload/hooks/use-image-upload", () => ({
  useImageUpload: () => ({ isUploading: upload.isUploading.current, uploadFiles: upload.uploadFiles }),
}))
vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

const images: readonly GalleryImage[] = [
  { id: "one", url: "https://cdn.example.test/one.webp" },
  { id: "two", url: "https://cdn.example.test/two.webp" },
  { id: "three", url: "https://cdn.example.test/three.webp" },
]

const handlers = () => ({
  onChange: vi.fn<(next: readonly GalleryImage[]) => void>(),
  onMainChange: vi.fn<(id: string | undefined) => void>(),
})

const idsOf = (next: readonly GalleryImage[] | undefined): (string | undefined)[] => (next ?? []).map((image) => image.id)

describe("ImageGalleryUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    upload.isUploading.current = false
    upload.uploadFiles.mockImplementation((files: readonly File[]) =>
      Promise.resolve(files.map((file) => `https://cdn.example.test/${file.name}`)),
    )
  })

  afterEach(() => {
    cleanup()
  })

  it("shows only a full width dropzone while the gallery is empty", () => {
    renderWithProviders(<ImageGalleryUpload mainId={undefined} value={[]} {...handlers()} />)

    expect(screen.getByText("Click to upload or drag and drop")).toBeInTheDocument()
    expect(screen.queryByRole("listitem")).toBeNull()
  })

  it("renders one tile per image plus the add tile", () => {
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...handlers()} />)

    expect(screen.getAllByRole("listitem")).toHaveLength(images.length + 1)
    expect(screen.getByText("Add images")).toBeInTheDocument()
  })

  it("badges the main image only", () => {
    renderWithProviders(<ImageGalleryUpload mainId="two" value={images} {...handlers()} />)

    expect(screen.getAllByText("Main")).toHaveLength(1)
    expect(screen.getAllByRole("button", { name: "Set as main" })).toHaveLength(2)
  })

  it("appends uploaded images and keeps the first one as the main image", async () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)
    const addTileInputs = screen.getAllByRole("listitem")

    expect(addTileInputs).toHaveLength(4)

    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
    const last = inputs.item(inputs.length - 1)
    await userEvent.upload(last, new File(["binary"], "four.png", { type: "image/png" }))

    await waitFor(() => {
      expect(props.onChange).toHaveBeenCalledTimes(1)
    })
    expect(idsOf(props.onChange.mock.calls[0]?.[0])).toStrictEqual(["one", "two", "three", expect.any(String)])
    expect(props.onMainChange).toHaveBeenCalledWith("one")
  })

  it("promotes an image to main by moving it to the front", async () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)

    const [, secondSetMain] = screen.getAllByRole("button", { name: "Set as main" })
    await userEvent.click(secondSetMain ?? document.body)

    expect(idsOf(props.onChange.mock.calls[0]?.[0])).toStrictEqual(["three", "one", "two"])
    expect(props.onMainChange).toHaveBeenCalledWith("three")
  })

  it("removes an image and hands the main slot to the new first image", async () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)

    const [firstRemove] = screen.getAllByRole("button", { name: "Remove" })
    await userEvent.click(firstRemove ?? document.body)

    expect(idsOf(props.onChange.mock.calls[0]?.[0])).toStrictEqual(["two", "three"])
    expect(props.onMainChange).toHaveBeenCalledWith("two")
  })

  it("moves an image one place right with the arrow keys", async () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)

    screen.getByRole("button", { name: "Image 1 of 3. Use arrow keys to reorder." }).focus()
    await userEvent.keyboard("{ArrowRight}")

    expect(idsOf(props.onChange.mock.calls[0]?.[0])).toStrictEqual(["two", "one", "three"])
  })

  it("moves an image one place left with the arrow keys", async () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)

    screen.getByRole("button", { name: "Image 3 of 3. Use arrow keys to reorder." }).focus()
    await userEvent.keyboard("{ArrowUp}")

    expect(idsOf(props.onChange.mock.calls[0]?.[0])).toStrictEqual(["one", "three", "two"])
  })

  it("refuses to move the first image further left", async () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)

    screen.getByRole("button", { name: "Image 1 of 3. Use arrow keys to reorder." }).focus()
    await userEvent.keyboard("{ArrowLeft}")

    expect(props.onChange).not.toHaveBeenCalled()
  })

  it("reorders while one tile is dragged over another", () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)
    const tiles = screen.getAllByRole("button", { name: /Use arrow keys to reorder/u })

    fireEvent.dragStart(tiles[2] ?? document.body)
    fireEvent.dragOver(tiles[0] ?? document.body)

    expect(idsOf(props.onChange.mock.calls[0]?.[0])).toStrictEqual(["three", "one", "two"])
  })

  it("ignores a tile dragged over itself", () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)
    const tiles = screen.getAllByRole("button", { name: /Use arrow keys to reorder/u })

    fireEvent.dragStart(tiles[1] ?? document.body)
    fireEvent.dragOver(tiles[1] ?? document.body)

    expect(props.onChange).not.toHaveBeenCalled()
  })

  it("locks every tile while an upload is in flight", () => {
    upload.isUploading.current = true
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...handlers()} />)

    expect(screen.getByText("Uploading…")).toBeInTheDocument()
    expect(screen.getAllByRole("button", { name: "Remove" })[0]).toBeDisabled()
    expect(screen.getByRole("button", { name: "Image 1 of 3. Use arrow keys to reorder." })).toBeDisabled()
  })
})

describe("ImageGalleryUpload edge cases", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    upload.isUploading.current = false
    upload.uploadFiles.mockImplementation((files: readonly File[]) =>
      Promise.resolve(files.map((file) => `https://cdn.example.test/${file.name}`)),
    )
  })

  afterEach(() => {
    cleanup()
  })

  it("locks every tile while the whole field is disabled", () => {
    renderWithProviders(<ImageGalleryUpload disabled mainId="one" value={images} {...handlers()} />)

    expect(screen.getAllByRole("button", { name: "Remove" })[0]).toBeDisabled()
    expect(screen.getAllByRole("button", { name: "Set as main" })[0]).toBeDisabled()
    expect(screen.getByRole("button", { name: "Image 1 of 3. Use arrow keys to reorder." })).toBeDisabled()
  })

  it("leaves the gallery untouched when the upload yields no url", async () => {
    upload.uploadFiles.mockResolvedValue([])
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)
    const inputs = document.querySelectorAll<HTMLInputElement>('input[type="file"]')
    await userEvent.upload(inputs.item(inputs.length - 1), new File(["binary"], "four.png", { type: "image/png" }))

    await waitFor(() => {
      expect(upload.uploadFiles).toHaveBeenCalledTimes(1)
    })

    expect(props.onChange).not.toHaveBeenCalled()
    expect(props.onMainChange).not.toHaveBeenCalled()
  })

  it("keeps the first image where it is when it is set as main again", async () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="two" value={images} {...props} />)
    const [firstSetMain] = screen.getAllByRole("button", { name: "Set as main" })
    await userEvent.click(firstSetMain ?? document.body)

    expect(props.onChange).not.toHaveBeenCalled()
  })

  it("refuses to move the last image further right", async () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)

    screen.getByRole("button", { name: "Image 3 of 3. Use arrow keys to reorder." }).focus()
    await userEvent.keyboard("{ArrowDown}")

    expect(props.onChange).not.toHaveBeenCalled()
  })

  it("ignores keys that do not reorder the gallery", async () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)

    screen.getByRole("button", { name: "Image 1 of 3. Use arrow keys to reorder." }).focus()
    await userEvent.keyboard("{End}")

    expect(props.onChange).not.toHaveBeenCalled()
  })

  it("stops reordering once the drag has ended", () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={images} {...props} />)
    const tiles = screen.getAllByRole("button", { name: /Use arrow keys to reorder/u })

    fireEvent.dragStart(tiles[2] ?? document.body)
    fireEvent.dragEnd(tiles[2] ?? document.body)
    fireEvent.dragOver(tiles[0] ?? document.body)

    expect(props.onChange).not.toHaveBeenCalled()
  })

  it("empties the main slot when the last image is removed", async () => {
    const props = handlers()
    renderWithProviders(<ImageGalleryUpload mainId="one" value={[images[0] ?? { id: "one", url: "one" }]} {...props} />)
    const [firstRemove] = screen.getAllByRole("button", { name: "Remove" })
    await userEvent.click(firstRemove ?? document.body)

    expect(props.onChange).toHaveBeenCalledWith([])
    expect(props.onMainChange).toHaveBeenCalledWith(undefined)
  })
})
