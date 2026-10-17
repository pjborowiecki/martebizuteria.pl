import { describe, expect, it } from "vite-plus/test"

import {
  ACCEPTED_IMAGE_ACCEPT_ATTR,
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MEDIA_ERROR_CODES,
  MEDIA_FOLDERS,
  MIME_EXTENSION,
  isAcceptedImageMime,
  uploadImageInputSchema,
} from "~/src/integrations/cloudflare-r2/media.zod"

const uploadOf = (folder?: string): FormData => {
  const data = new FormData()
  data.set("file", new File([new Uint8Array([1])], "ring.png", { type: "image/png" }))
  if (folder !== undefined) {
    data.set("folder", folder)
  }

  return data
}

describe("uploadImageInputSchema", () => {
  it.each(MEDIA_FOLDERS)("keeps the %s folder", (folder) => {
    expect(uploadImageInputSchema.parse(uploadOf(folder)).folder).toBe(folder)
  })

  it.each([["avatars"], ["../products"], [undefined]])("stores a %j folder under uploads", (folder) => {
    expect(uploadImageInputSchema.parse(uploadOf(folder)).folder).toBe("uploads")
  })

  it("refuses a request that is not a form", () => {
    expect(uploadImageInputSchema.safeParse({ file: "ring.png" }).error?.issues.map((issue) => issue.message)).toStrictEqual([
      MEDIA_ERROR_CODES.INVALID_FILE,
    ])
  })

  it("hands over the file itself", () => {
    expect(uploadImageInputSchema.parse(uploadOf()).file).toBeInstanceOf(File)
  })

  it("names the first rule a file breaks", () => {
    const data = new FormData()
    data.set("file", new File([], "notes.txt", { type: "text/plain" }))

    expect(uploadImageInputSchema.safeParse(data).error?.issues.map((issue) => issue.message)).toStrictEqual([
      MEDIA_ERROR_CODES.INVALID_TYPE,
      MEDIA_ERROR_CODES.TOO_LARGE,
    ])
  })
})

describe("isAcceptedImageMime", () => {
  it.each(ACCEPTED_IMAGE_MIME_TYPES)("accepts %s", (mime) => {
    expect(isAcceptedImageMime(mime)).toBe(true)
  })

  it.each([["image/gif"], ["image/svg+xml"], ["application/pdf"], ["IMAGE/PNG"], [""]])("rejects %j", (mime) => {
    expect(isAcceptedImageMime(mime)).toBe(false)
  })
})

describe("media upload constraints", () => {
  it("advertises every accepted mime type to the file picker", () => {
    expect(ACCEPTED_IMAGE_ACCEPT_ATTR).toBe("image/jpeg,image/png,image/webp,image/avif")
  })

  it("caps an upload at five mebibytes", () => {
    expect(MAX_IMAGE_BYTES).toBe(5 * 1024 * 1024)
  })

  it("maps every accepted mime type to a file extension", () => {
    expect(ACCEPTED_IMAGE_MIME_TYPES.map((mime) => MIME_EXTENSION[mime])).toStrictEqual(["jpg", "png", "webp", "avif"])
  })
})
