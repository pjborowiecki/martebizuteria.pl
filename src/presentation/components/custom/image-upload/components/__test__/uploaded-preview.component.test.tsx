import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { UploadedPreview } from "~/src/presentation/components/custom/image-upload/components/uploaded-preview"

vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

const OVERLAY = "https://cdn.example.test/placeholder.webp"

const handlers = () => ({ onPick: vi.fn<() => void>(), onRemove: vi.fn<() => void>() })

describe("UploadedPreview", () => {
  afterEach(() => {
    cleanup()
  })

  it("shows the stored image once an upload has finished", () => {
    const { container } = renderWithProviders(
      <UploadedPreview
        disabled={false}
        isUploading={false}
        overlaySrc={OVERLAY}
        value="https://cdn.example.test/ring.webp"
        {...handlers()}
      />,
    )

    expect(container.querySelector("img")).toHaveAttribute("src", "https://cdn.example.test/ring.webp")
  })

  it("falls back to the overlay background while there is no stored image", () => {
    const { container } = renderWithProviders(
      <UploadedPreview disabled={false} isUploading={false} overlaySrc={OVERLAY} value="" {...handlers()} />,
    )

    expect(container.querySelector("img")).toBeNull()
    expect(container.querySelector('[style*="background-image"]')).not.toBeNull()
  })

  it("replaces the actions with an uploading indicator while the upload runs", () => {
    renderWithProviders(
      <UploadedPreview disabled={false} isUploading overlaySrc={OVERLAY} value="https://cdn.example.test/ring.webp" {...handlers()} />,
    )

    expect(screen.getByText("Uploading…")).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Change" })).toBeNull()
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull()
  })

  it("offers change and remove actions once the upload has finished", async () => {
    const props = handlers()
    renderWithProviders(
      <UploadedPreview disabled={false} isUploading={false} overlaySrc={OVERLAY} value="https://cdn.example.test/ring.webp" {...props} />,
    )

    await userEvent.click(screen.getByRole("button", { name: "Change" }))
    await userEvent.click(screen.getByRole("button", { name: "Remove" }))

    expect(props.onPick).toHaveBeenCalledTimes(1)
    expect(props.onRemove).toHaveBeenCalledTimes(1)
  })

  it("locks both actions while the field is disabled", async () => {
    const props = handlers()
    renderWithProviders(
      <UploadedPreview disabled isUploading={false} overlaySrc={OVERLAY} value="https://cdn.example.test/ring.webp" {...props} />,
    )

    expect(screen.getByRole("button", { name: "Change" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Remove" })).toBeDisabled()

    await userEvent.click(screen.getByRole("button", { name: "Remove" }))

    expect(props.onRemove).not.toHaveBeenCalled()
  })
})
