import { act, cleanup, fireEvent, screen, waitFor } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ImageUpload } from "~/src/presentation/components/custom/image-upload/components/image-upload"

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

const pngFile = (name: string) => new File(["binary"], name, { type: "image/png" })

const revokeObjectURL = vi.fn<(url: string) => void>()

const fileInputOf = (container: HTMLElement): HTMLInputElement => {
  const input = container.querySelector<HTMLInputElement>('input[type="file"]')
  if (input === null) {
    throw new Error("expected a hidden file input")
  }

  return input
}

describe("ImageUpload", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    upload.isUploading.current = false
    vi.stubGlobal("URL", { ...URL, createObjectURL: () => "blob:preview", revokeObjectURL })
  })

  afterEach(() => {
    cleanup()
  })

  it("offers the dropzone while no image has been chosen", () => {
    renderWithProviders(<ImageUpload onChange={vi.fn<(url: string) => void>()} value="" />)

    expect(screen.getByRole("button", { name: /Click to upload or drag and drop/u })).toBeInTheDocument()
  })

  it("shows the stored image instead of the dropzone once one exists", () => {
    const { container } = renderWithProviders(
      <ImageUpload onChange={vi.fn<(url: string) => void>()} value="https://cdn.example.test/ring.webp" />,
    )

    expect(screen.queryByRole("button", { name: /Click to upload/u })).toBeNull()
    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example.test/ring.webp")
  })

  it("uploads the chosen file and publishes the returned url", async () => {
    const onChange = vi.fn<(url: string) => void>()
    const { container } = renderWithProviders(<ImageUpload onChange={onChange} value="" />)

    await userEvent.upload(fileInputOf(container), pngFile("ring.png"))

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("https://cdn.example.test/ring.png")
    })
    expect(upload.uploadFiles.mock.calls[0]?.[0].map((file) => file.name)).toStrictEqual(["ring.png"])
  })

  it("keeps the value untouched when the upload returns nothing", async () => {
    upload.uploadFiles.mockResolvedValueOnce([])
    const onChange = vi.fn<(url: string) => void>()
    const { container } = renderWithProviders(<ImageUpload onChange={onChange} value="" />)

    await userEvent.upload(fileInputOf(container), pngFile("ring.png"))

    await waitFor(() => {
      expect(upload.uploadFiles).toHaveBeenCalledTimes(1)
    })
    expect(onChange).not.toHaveBeenCalled()
  })

  it("opens the file picker from the dropzone", async () => {
    const { container } = renderWithProviders(<ImageUpload onChange={vi.fn<(url: string) => void>()} value="" />)
    const clicked = vi.fn<() => void>()
    fileInputOf(container).addEventListener("click", clicked)

    await userEvent.click(screen.getByRole("button", { name: /Click to upload/u }))

    expect(clicked).toHaveBeenCalledTimes(1)
  })

  it("does nothing when the picker is dismissed without a file", () => {
    const onChange = vi.fn<(url: string) => void>()
    const { container } = renderWithProviders(<ImageUpload onChange={onChange} value="" />)

    fireEvent.change(fileInputOf(container), { target: { files: [] } })

    expect(upload.uploadFiles).not.toHaveBeenCalled()
    expect(onChange).not.toHaveBeenCalled()
  })

  it("clears the stored url when the image is removed", async () => {
    const onChange = vi.fn<(url: string) => void>()
    renderWithProviders(<ImageUpload onChange={onChange} value="https://cdn.example.test/ring.webp" />)

    await userEvent.click(screen.getByRole("button", { name: "Remove" }))

    expect(onChange).toHaveBeenCalledWith("")
  })

  it("uploads a dropped file", async () => {
    const onChange = vi.fn<(url: string) => void>()
    renderWithProviders(<ImageUpload onChange={onChange} value="" />)

    fireEvent.drop(screen.getByRole("button", { name: /Click to upload/u }), { dataTransfer: { files: [pngFile("chain.png")] } })

    await waitFor(() => {
      expect(onChange).toHaveBeenCalledWith("https://cdn.example.test/chain.png")
    })
  })

  it("highlights the dropzone while a file is dragged over it", () => {
    renderWithProviders(<ImageUpload onChange={vi.fn<(url: string) => void>()} value="" />)

    fireEvent.dragOver(screen.getByRole("button", { name: /Click to upload/u }))

    expect(screen.getByText("Drop image to upload")).toBeInTheDocument()

    fireEvent.dragLeave(screen.getByRole("button", { name: /Click to upload/u }))

    expect(screen.queryByText("Drop image to upload")).toBeNull()
  })

  it("refuses dropped files while disabled", () => {
    const onChange = vi.fn<(url: string) => void>()
    renderWithProviders(<ImageUpload disabled onChange={onChange} value="" />)

    fireEvent.dragOver(screen.getByRole("button", { name: /Click to upload/u }))
    fireEvent.drop(screen.getByRole("button", { name: /Click to upload/u }), { dataTransfer: { files: [pngFile("chain.png")] } })

    expect(screen.queryByText("Drop image to upload")).toBeNull()
    expect(upload.uploadFiles).not.toHaveBeenCalled()
  })

  it("marks the dropzone invalid when the field is in error", () => {
    renderWithProviders(<ImageUpload invalid onChange={vi.fn<(url: string) => void>()} value="" />)

    expect(screen.getByRole("button", { name: /Click to upload/u }).className).toContain("border-destructive")
  })

  it("shows the local preview during upload and releases it once the upload settles", async () => {
    const completion = Promise.withResolvers<string[]>()
    upload.uploadFiles.mockImplementationOnce(() => {
      upload.isUploading.current = true

      return completion.promise
    })
    const onChange = vi.fn<(url: string) => void>()
    const { container } = renderWithProviders(<ImageUpload onChange={onChange} value="" />)

    await userEvent.upload(fileInputOf(container), pngFile("ring.png"))

    expect(screen.getByText("Uploading…")).toBeInTheDocument()
    expect(container.querySelector("[style]")).toHaveStyle({ backgroundImage: "url(blob:preview)" })
    expect(fileInputOf(container)).toBeDisabled()
    expect(onChange).not.toHaveBeenCalled()

    await act(async () => {
      upload.isUploading.current = false
      completion.resolve(["https://cdn.example.test/ring.png"])
      await completion.promise
    })

    expect(onChange).toHaveBeenCalledWith("https://cdn.example.test/ring.png")
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:preview")
    expect(screen.queryByText("Uploading…")).not.toBeInTheDocument()
  })
})
