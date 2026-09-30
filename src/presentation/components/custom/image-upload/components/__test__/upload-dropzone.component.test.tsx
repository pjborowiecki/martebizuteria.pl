import { cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { UploadDropzone } from "~/src/presentation/components/custom/image-upload/components/upload-dropzone"

const handlers = () => ({
  onDragLeave: vi.fn<() => void>(),
  onDragOver: vi.fn<() => void>(),
  onDrop: vi.fn<() => void>(),
  onPick: vi.fn<() => void>(),
})

describe("UploadDropzone", () => {
  afterEach(() => {
    cleanup()
  })

  it("invites the admin to upload and states the accepted formats", () => {
    renderWithProviders(<UploadDropzone disabled={false} invalid={false} isDragging={false} {...handlers()} />)

    expect(screen.getByRole("button", { name: /Click to upload or drag and drop/u })).toBeInTheDocument()
    expect(screen.getByText("JPG, PNG, WEBP or AVIF · up to 5MB")).toBeInTheDocument()
  })

  it("opens the file picker when the zone is clicked", async () => {
    const props = handlers()
    renderWithProviders(<UploadDropzone disabled={false} invalid={false} isDragging={false} {...props} />)

    await userEvent.click(screen.getByRole("button", { name: /Click to upload/u }))

    expect(props.onPick).toHaveBeenCalledTimes(1)
  })

  it("hides the drop overlay until a file is dragged over it", () => {
    renderWithProviders(<UploadDropzone disabled={false} invalid={false} isDragging={false} {...handlers()} />)

    expect(screen.queryByText("Drop image to upload")).toBeNull()
  })

  it("shows the drop overlay and highlights the border while dragging", () => {
    renderWithProviders(<UploadDropzone disabled={false} invalid={false} isDragging {...handlers()} />)

    expect(screen.getByText("Drop image to upload")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Click to upload/u }).className).toContain("border-foreground")
  })

  it("marks the zone as invalid when the field is in error", () => {
    renderWithProviders(<UploadDropzone disabled={false} invalid isDragging={false} {...handlers()} />)

    expect(screen.getByRole("button", { name: /Click to upload/u }).className).toContain("border-destructive")
  })

  it("reports drag over, drag leave and drop to its owner", () => {
    const props = handlers()
    renderWithProviders(<UploadDropzone disabled={false} invalid={false} isDragging={false} {...props} />)
    const zone = screen.getByRole("button", { name: /Click to upload/u })

    fireEvent.dragOver(zone)
    fireEvent.dragLeave(zone)
    fireEvent.drop(zone)

    expect(props.onDragOver).toHaveBeenCalledTimes(1)
    expect(props.onDragLeave).toHaveBeenCalledTimes(1)
    expect(props.onDrop).toHaveBeenCalledTimes(1)
  })

  it("refuses to open the picker while disabled", async () => {
    const props = handlers()
    renderWithProviders(<UploadDropzone disabled invalid={false} isDragging={false} {...props} />)

    const zone = screen.getByRole("button", { name: /Click to upload/u })
    expect(zone).toBeDisabled()

    await userEvent.click(zone)

    expect(props.onPick).not.toHaveBeenCalled()
  })
})
