import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { MAX_IMAGE_BYTES, MEDIA_ERROR_CODES } from "~/src/integrations/cloudflare-r2/media.zod"

interface PutCall {
  readonly body: ArrayBuffer
  readonly key: string
  readonly options: { httpMetadata: { cacheControl: string; contentType: string } }
}

const bucket = vi.hoisted(() => {
  const existingKeys = new Set<string>()
  const puts: PutCall[] = []

  return {
    existingKeys,
    head: vi.fn((key: string) => Promise.resolve(existingKeys.has(key) ? { key } : null)),
    put: vi.fn((key: string, body: ArrayBuffer, options: PutCall["options"]) => {
      puts.push({ body, key, options })

      return Promise.resolve({ key })
    }),
    puts,
  }
})

vi.mock("cloudflare:workers", () => ({ env: { IMAGES: { head: bucket.head, put: bucket.put } } }))
vi.mock("~/src/integrations/better-auth/auth.middleware", () => ({ authorized: () => ({}) }))
vi.mock("~/src/lib/url", () => ({ getAssetURL: (key: string) => `https://cdn.test/${key}` }))
const passthrough = vi.hoisted(
  () =>
    (data: unknown): unknown =>
      data,
)

vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = passthrough
    const builder = {
      handler: (handler: (options: { data: unknown }) => unknown) => (options: { data: unknown }) =>
        handler({ data: validate(options.data) }),
      middleware: () => builder,
      validator: (validator: (data: unknown) => unknown) => {
        validate = validator

        return builder
      },
    }

    return builder
  },
}))

const { uploadImageFn } = await import("~/src/integrations/cloudflare-r2/media.mutations")

const PNG_BYTES = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])

const PNG_DIGEST = "4c4b6a3be1314ab86138bef4314dde022e600960d8689a2c8f8631802d20dab6"

const formDataWith = (file: File | string, folder?: string): FormData => {
  const data = new FormData()
  data.set("file", file)
  if (folder !== undefined) {
    data.set("folder", folder)
  }

  return data
}

const pngFile = (name = "ring.png"): File => new File([PNG_BYTES], name, { type: "image/png" })

beforeEach(() => {
  vi.clearAllMocks()
  bucket.existingKeys.clear()
  bucket.puts.length = 0
})

describe("uploadImageFn rejections", () => {
  it("refuses a form entry that is not a file", async () => {
    await expect(uploadImageFn({ data: formDataWith("not-a-file") })).rejects.toThrow(MEDIA_ERROR_CODES.INVALID_FILE)
  })

  it("refuses a file type the store does not accept", async () => {
    const file = new File([PNG_BYTES], "notes.txt", { type: "text/plain" })

    await expect(uploadImageFn({ data: formDataWith(file) })).rejects.toThrow(MEDIA_ERROR_CODES.INVALID_TYPE)
  })

  it("refuses an empty file", async () => {
    const file = new File([], "empty.png", { type: "image/png" })

    await expect(uploadImageFn({ data: formDataWith(file) })).rejects.toThrow(MEDIA_ERROR_CODES.TOO_LARGE)
  })

  it("refuses a file over the size ceiling", async () => {
    const file = new File([new Uint8Array(MAX_IMAGE_BYTES + 1)], "huge.png", { type: "image/png" })

    await expect(uploadImageFn({ data: formDataWith(file) })).rejects.toThrow(MEDIA_ERROR_CODES.TOO_LARGE)
  })

  it("stores nothing when the upload is rejected", async () => {
    await expect(uploadImageFn({ data: formDataWith("not-a-file") })).rejects.toThrow(MEDIA_ERROR_CODES.INVALID_FILE)

    expect(bucket.put).not.toHaveBeenCalled()
  })
})

describe("uploadImageFn storage key", () => {
  it("names the object after the content hash and the MIME extension", async () => {
    const result = await uploadImageFn({ data: formDataWith(pngFile(), "products") })

    expect(result).toStrictEqual({
      key: `products/${PNG_DIGEST}.png`,
      url: `https://cdn.test/products/${PNG_DIGEST}.png`,
    })
  })

  it("falls back to the uploads folder for an unknown folder name", async () => {
    const result = await uploadImageFn({ data: formDataWith(pngFile(), "somewhere-else") })

    expect(result.key).toBe(`uploads/${PNG_DIGEST}.png`)
  })

  it("falls back to the uploads folder when no folder is supplied", async () => {
    const result = await uploadImageFn({ data: formDataWith(pngFile()) })

    expect(result.key).toBe(`uploads/${PNG_DIGEST}.png`)
  })

  it("gives the same key to identical bytes uploaded under different names", async () => {
    const first = await uploadImageFn({ data: formDataWith(pngFile("a.png"), "products") })
    const second = await uploadImageFn({ data: formDataWith(pngFile("b.png"), "products") })

    expect(second.key).toBe(first.key)
  })

  it("uses the extension of the uploaded MIME type", async () => {
    const file = new File([PNG_BYTES], "ring.webp", { type: "image/webp" })
    const result = await uploadImageFn({ data: formDataWith(file, "categories") })

    expect(result.key).toBe(`categories/${PNG_DIGEST}.webp`)
  })
})

describe("uploadImageFn writes", () => {
  it("stores the bytes with an immutable cache header and the real content type", async () => {
    await uploadImageFn({ data: formDataWith(pngFile(), "products") })

    expect(bucket.puts).toHaveLength(1)
    expect(bucket.puts[0]?.key).toBe(`products/${PNG_DIGEST}.png`)
    expect(bucket.puts[0]?.options).toStrictEqual({
      httpMetadata: { cacheControl: "public, max-age=31536000, immutable", contentType: "image/png" },
    })
    expect(new Uint8Array(bucket.puts[0]?.body ?? new ArrayBuffer(0))).toStrictEqual(PNG_BYTES)
  })

  it("skips the write when the object is already stored but still returns its URL", async () => {
    bucket.existingKeys.add(`products/${PNG_DIGEST}.png`)

    const result = await uploadImageFn({ data: formDataWith(pngFile(), "products") })

    expect(bucket.put).not.toHaveBeenCalled()
    expect(result.url).toBe(`https://cdn.test/products/${PNG_DIGEST}.png`)
  })

  it("asks the bucket whether the object exists before writing", async () => {
    await uploadImageFn({ data: formDataWith(pngFile(), "products") })

    expect(bucket.head).toHaveBeenCalledWith(`products/${PNG_DIGEST}.png`)
  })
})
