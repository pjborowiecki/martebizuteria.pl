import { cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ACCEPTED_IMAGE_ACCEPT_ATTR } from "~/src/integrations/cloudflare-r2/media.zod"

import { GalleryAddTile } from "~/src/presentation/components/custom/image-upload/components/gallery-add-tile"

const pngFile = (name: string) => new File(["binary"], name, { type: "image/png" })

describe("GalleryAddTile", () => {
  afterEach(() => {
    cleanup()
  })

  it("labels the grid tile as an add action and accepts only images", () => {
    const { container } = renderWithProviders(
      <GalleryAddTile disabled={false} isUploading={false} onFiles={vi.fn<(files: readonly File[]) => void>()} />,
    )

    expect(screen.getByText("Add images")).toBeInTheDocument()
    expect(container.querySelector('input[type="file"]')).toHaveAttribute("accept", ACCEPTED_IMAGE_ACCEPT_ATTR)
    expect(container.querySelector('input[type="file"]')).toHaveAttribute("multiple")
  })

  it("renders as a full width dropzone with the upload hint when asked", () => {
    renderWithProviders(
      <GalleryAddTile disabled={false} isUploading={false} layout="dropzone" onFiles={vi.fn<(files: readonly File[]) => void>()} />,
    )

    expect(screen.getByText("Click to upload or drag and drop")).toBeInTheDocument()
    expect(screen.getByText("JPG, PNG, WEBP or AVIF · up to 5MB")).toBeInTheDocument()
    expect(screen.queryByText("Add images")).toBeNull()
  })

  it("shows the uploading label instead of the add label while uploading", () => {
    renderWithProviders(
      <GalleryAddTile disabled={false} isUploading layout="dropzone" onFiles={vi.fn<(files: readonly File[]) => void>()} />,
    )

    expect(screen.getByText("Uploading…")).toBeInTheDocument()
    expect(screen.queryByText("Click to upload or drag and drop")).toBeNull()
  })

  it("opens the file picker from the tile itself", async () => {
    const { container } = renderWithProviders(
      <GalleryAddTile disabled={false} isUploading={false} onFiles={vi.fn<(files: readonly File[]) => void>()} />,
    )
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    if (input === null) {
      throw new Error("expected a hidden file input")
    }
    const clicked = vi.fn<() => void>()
    input.addEventListener("click", clicked)

    await userEvent.click(screen.getByRole("button", { name: /Add images/u }))

    expect(clicked).toHaveBeenCalledTimes(1)
  })

  it("reports the files chosen through the hidden input and clears it afterwards", async () => {
    const onFiles = vi.fn<(files: readonly File[]) => void>()
    const { container } = renderWithProviders(<GalleryAddTile disabled={false} isUploading={false} onFiles={onFiles} />)
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')
    if (input === null) {
      throw new Error("expected a hidden file input")
    }

    await userEvent.upload(input, [pngFile("ring.png"), pngFile("chain.png")])

    expect(onFiles).toHaveBeenCalledTimes(1)
    expect(onFiles.mock.calls[0]?.[0].map((file) => file.name)).toStrictEqual(["ring.png", "chain.png"])
    expect(input).toHaveValue("")
  })

  it("reports files dropped onto the tile", () => {
    const onFiles = vi.fn<(files: readonly File[]) => void>()
    renderWithProviders(<GalleryAddTile disabled={false} isUploading={false} onFiles={onFiles} />)

    fireEvent.drop(screen.getByRole("button"), { dataTransfer: { files: [pngFile("ring.png")] } })

    expect(onFiles.mock.calls[0]?.[0].map((file) => file.name)).toStrictEqual(["ring.png"])
  })

  it("highlights the tile while a file is dragged over it and drops the highlight on leave", () => {
    renderWithProviders(<GalleryAddTile disabled={false} isUploading={false} onFiles={vi.fn<(files: readonly File[]) => void>()} />)
    const tile = screen.getByRole("button")

    fireEvent.dragOver(tile)

    expect(tile.className).toContain("border-foreground/60")

    fireEvent.dragLeave(tile)

    expect(tile.className).not.toContain("border-foreground/60")
  })

  it("ignores drags and drops while disabled", () => {
    const onFiles = vi.fn<(files: readonly File[]) => void>()
    renderWithProviders(<GalleryAddTile disabled isUploading={false} onFiles={onFiles} />)
    const tile = screen.getByRole("button")

    fireEvent.dragOver(tile)
    fireEvent.drop(tile, { dataTransfer: { files: [pngFile("ring.png")] } })

    expect(tile.className).not.toContain("border-foreground/60")
    expect(onFiles).not.toHaveBeenCalled()
  })

  it("highlights the full dropzone during a drag and clears it after dropping", () => {
    const onFiles = vi.fn<(files: readonly File[]) => void>()
    renderWithProviders(<GalleryAddTile disabled={false} isUploading={false} layout="dropzone" onFiles={onFiles} />)
    const dropzone = screen.getByRole("button")
    const file = pngFile("ring.png")

    fireEvent.dragOver(dropzone)

    expect(dropzone).toHaveClass("border-foreground", "bg-muted/30")

    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } })

    expect(dropzone).not.toHaveClass("border-foreground")
    expect(onFiles).toHaveBeenCalledWith([file])
  })
})
