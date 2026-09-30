import { type ReactNode } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { act, renderHook } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_LOCALE, TEST_MESSAGES } from "~/src/platform/testing/lib/messages"

const { toastError, uploadImageFn } = vi.hoisted(() => ({ toastError: vi.fn(), uploadImageFn: vi.fn() }))

vi.mock("sonner", () => ({ toast: { error: toastError } }))
vi.mock("~/src/integrations/cloudflare-r2/media.mutations", () => ({ uploadImageFn }))

import { MAX_IMAGE_BYTES } from "~/src/integrations/cloudflare-r2/media.zod"

import { useImageUpload } from "~/src/presentation/components/custom/image-upload/hooks/use-image-upload"

const Providers = ({ children }: Readonly<{ children: ReactNode }>) => (
  <IntlProvider locale={TEST_LOCALE} messages={TEST_MESSAGES} timeZone="Europe/Warsaw">
    <QueryClientProvider client={new QueryClient()}>{children}</QueryClientProvider>
  </IntlProvider>
)

const pngFile = (name: string, bytes = 8): File => new File([new Uint8Array(bytes)], name, { type: "image/png" })

const renderUpload = (onUploadingChange?: (uploading: boolean) => void) =>
  renderHook(() => useImageUpload("products", onUploadingChange), { wrapper: Providers })

beforeEach(() => {
  toastError.mockReset()
  uploadImageFn.mockReset()
})

describe("useImageUpload", () => {
  it("uploads each accepted file and reports the stored urls", async () => {
    uploadImageFn.mockResolvedValueOnce({ key: "products/a.png", url: "https://assets.test/products/a.png" })
    uploadImageFn.mockResolvedValueOnce({ key: "products/b.png", url: "https://assets.test/products/b.png" })
    const { result } = renderUpload()

    const urls = await act(() => result.current.uploadFiles([pngFile("a.png"), pngFile("b.png")]))

    expect(urls).toStrictEqual(["https://assets.test/products/a.png", "https://assets.test/products/b.png"])
    expect(uploadImageFn).toHaveBeenCalledTimes(2)
  })

  it("sends the file and its folder as form data", async () => {
    uploadImageFn.mockResolvedValueOnce({ key: "products/a.png", url: "https://assets.test/products/a.png" })
    const { result } = renderUpload()

    await act(() => result.current.uploadFiles([pngFile("a.png")]))
    const [call] = uploadImageFn.mock.calls
    const payload: unknown = call?.[0]
    const data = payload instanceof Object && "data" in payload ? payload.data : undefined

    expect(data).toBeInstanceOf(FormData)
    expect(data instanceof FormData ? data.get("folder") : undefined).toBe("products")
    expect(data instanceof FormData ? data.get("file") : undefined).toBeInstanceOf(File)
  })

  it("rejects a file type the bucket does not accept", async () => {
    const { result } = renderUpload()

    const urls = await act(() => result.current.uploadFiles([new File(["x"], "notes.pdf", { type: "application/pdf" })]))

    expect(urls).toStrictEqual([])
    expect(uploadImageFn).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith("Upload failed", { description: "Unsupported file type. Use JPG, PNG, WEBP or AVIF." })
  })

  it("rejects an empty file", async () => {
    const { result } = renderUpload()

    await act(() => result.current.uploadFiles([new File([], "empty.png", { type: "image/png" })]))

    expect(uploadImageFn).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith("Upload failed", { description: "Image is too large. Maximum size is 5MB." })
  })

  it("rejects a file above the size cap", async () => {
    const { result } = renderUpload()

    await act(() => result.current.uploadFiles([pngFile("huge.png", MAX_IMAGE_BYTES + 1)]))

    expect(uploadImageFn).not.toHaveBeenCalled()
    expect(toastError).toHaveBeenCalledWith("Upload failed", { description: "Image is too large. Maximum size is 5MB." })
  })

  it("uploads the accepted files and rejects the rest of a mixed selection", async () => {
    uploadImageFn.mockResolvedValueOnce({ key: "products/a.png", url: "https://assets.test/products/a.png" })
    const { result } = renderUpload()

    const urls = await act(() => result.current.uploadFiles([pngFile("a.png"), new File(["x"], "notes.pdf", { type: "application/pdf" })]))

    expect(urls).toStrictEqual(["https://assets.test/products/a.png"])
    expect(uploadImageFn).toHaveBeenCalledTimes(1)
  })

  it("keeps the urls that did upload when one of them fails", async () => {
    uploadImageFn.mockRejectedValueOnce(new Error("R2 unavailable"))
    uploadImageFn.mockResolvedValueOnce({ key: "products/b.png", url: "https://assets.test/products/b.png" })
    const { result } = renderUpload()

    const urls = await act(() => result.current.uploadFiles([pngFile("a.png"), pngFile("b.png")]))

    expect(urls).toStrictEqual(["https://assets.test/products/b.png"])
    expect(toastError).toHaveBeenCalledWith("Upload failed", { description: "The image could not be uploaded. Please try again." })
  })

  it("reports no upload in flight once the uploads settle", async () => {
    uploadImageFn.mockResolvedValueOnce({ key: "products/a.png", url: "https://assets.test/products/a.png" })
    const { result } = renderUpload()

    expect(result.current.isUploading).toBe(false)

    await act(() => result.current.uploadFiles([pngFile("a.png")]))

    expect(result.current.isUploading).toBe(false)
  })

  it("announces that an upload is in flight and then finished", async () => {
    const onUploadingChange = vi.fn<(uploading: boolean) => void>()
    const gate = Promise.withResolvers<{ key: string; url: string }>()
    uploadImageFn.mockImplementationOnce(() => gate.promise)
    const { result } = renderUpload(onUploadingChange)

    expect(onUploadingChange).toHaveBeenLastCalledWith(false)

    let pending: Promise<readonly string[]> = Promise.resolve([])
    act(() => {
      pending = result.current.uploadFiles([pngFile("a.png")])
    })

    expect(result.current.isUploading).toBe(true)
    expect(onUploadingChange).toHaveBeenLastCalledWith(true)

    await act(async () => {
      gate.resolve({ key: "products/a.png", url: "https://assets.test/products/a.png" })
      await pending
    })

    expect(result.current.isUploading).toBe(false)
    expect(onUploadingChange).toHaveBeenLastCalledWith(false)
  })

  it("does nothing at all when every file was rejected", async () => {
    const onUploadingChange = vi.fn<(uploading: boolean) => void>()
    const { result } = renderUpload(onUploadingChange)
    onUploadingChange.mockClear()

    await act(() => result.current.uploadFiles([new File(["x"], "notes.pdf", { type: "application/pdf" })]))

    expect(onUploadingChange).not.toHaveBeenCalled()
  })
})
