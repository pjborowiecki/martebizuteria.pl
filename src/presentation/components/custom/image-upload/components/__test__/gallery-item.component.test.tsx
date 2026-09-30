import { cleanup, fireEvent, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { GalleryItem } from "~/src/presentation/components/custom/image-upload/components/gallery-item"

vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

const image = { id: "image-1", url: "https://cdn.example.test/ring.webp" }

const handlers = () => ({
  onDragEndItem: vi.fn<() => void>(),
  onDragOverItem: vi.fn<(event: unknown, overId: string) => void>(),
  onDragStartItem: vi.fn<(id: string) => void>(),
  onKeyReorder: vi.fn<(event: unknown, id: string) => void>(),
  onRemove: vi.fn<(id: string) => void>(),
  onSetMain: vi.fn<(id: string) => void>(),
})

describe("GalleryItem", () => {
  afterEach(() => {
    cleanup()
  })

  it("announces its position in the gallery for keyboard reordering", () => {
    renderWithProviders(
      <GalleryItem disabled={false} image={image} index={1} isDragging={false} isMain={false} total={4} {...handlers()} />,
    )

    expect(screen.getByRole("button", { name: "Image 2 of 4. Use arrow keys to reorder." })).toBeInTheDocument()
  })

  it("renders the image it was given", () => {
    const { container } = renderWithProviders(
      <GalleryItem disabled={false} image={image} index={0} isDragging={false} isMain={false} total={1} {...handlers()} />,
    )

    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example.test/ring.webp")
  })

  it("offers a set main action for a secondary image", async () => {
    const props = handlers()
    renderWithProviders(<GalleryItem disabled={false} image={image} index={0} isDragging={false} isMain={false} total={2} {...props} />)

    await userEvent.click(screen.getByRole("button", { name: "Set as main" }))

    expect(props.onSetMain).toHaveBeenCalledWith("image-1")
  })

  it("badges the main image and drops its set main action", () => {
    renderWithProviders(<GalleryItem disabled={false} image={image} index={0} isDragging={false} isMain total={2} {...handlers()} />)

    expect(screen.getByText("Main")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Set as main" })).toBeNull()
  })

  it("removes the image it belongs to", async () => {
    const props = handlers()
    renderWithProviders(<GalleryItem disabled={false} image={image} index={0} isDragging={false} isMain={false} total={2} {...props} />)

    await userEvent.click(screen.getByRole("button", { name: "Remove" }))

    expect(props.onRemove).toHaveBeenCalledWith("image-1")
  })

  it("reports drag start, drag over and drop with its own id", () => {
    const props = handlers()
    renderWithProviders(<GalleryItem disabled={false} image={image} index={0} isDragging={false} isMain={false} total={2} {...props} />)
    const tile = screen.getByRole("button", { name: /Use arrow keys to reorder/u })

    fireEvent.dragStart(tile)
    fireEvent.dragOver(tile)
    fireEvent.drop(tile)

    expect(props.onDragStartItem).toHaveBeenCalledWith("image-1")
    expect(props.onDragOverItem.mock.calls[0]?.[1]).toBe("image-1")
    expect(props.onDragEndItem).toHaveBeenCalledTimes(1)
  })

  it("passes keyboard reorder presses through with its own id", async () => {
    const props = handlers()
    renderWithProviders(<GalleryItem disabled={false} image={image} index={0} isDragging={false} isMain={false} total={2} {...props} />)

    screen.getByRole("button", { name: /Use arrow keys to reorder/u }).focus()
    await userEvent.keyboard("{ArrowRight}")

    expect(props.onKeyReorder.mock.calls[0]?.[1]).toBe("image-1")
  })

  it("fades the tile while it is the one being dragged", () => {
    renderWithProviders(<GalleryItem disabled={false} image={image} index={0} isDragging isMain={false} total={2} {...handlers()} />)

    expect(screen.getByRole("button", { name: /Use arrow keys to reorder/u }).className).toContain("opacity-40")
  })

  it("stops dragging and locks the actions while disabled", () => {
    renderWithProviders(<GalleryItem disabled image={image} index={0} isDragging={false} isMain={false} total={2} {...handlers()} />)

    expect(screen.getByRole("button", { name: /Use arrow keys to reorder/u })).toHaveAttribute("draggable", "false")
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Set as main" })).toBeDisabled()
  })
})
