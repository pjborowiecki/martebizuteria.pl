import { describe, expect, it } from "vite-plus/test"

import {
  ACCEPTED_IMAGE_ACCEPT_ATTR,
  ACCEPTED_IMAGE_MIME_TYPES,
  MAX_IMAGE_BYTES,
  MEDIA_FOLDERS,
  MIME_EXTENSION,
  isAcceptedImageMime,
  isMediaFolder,
} from "~/src/integrations/cloudflare-r2/media.zod"

describe("isMediaFolder", () => {
  it.each(MEDIA_FOLDERS)("accepts the %s folder", (folder) => {
    expect(isMediaFolder(folder)).toBe(true)
  })

  it("rejects a folder name the bucket does not use", () => {
    expect(isMediaFolder("avatars")).toBe(false)
  })

  it.each([[null], [undefined], [42], [["products"]], [{ folder: "products" }]])("rejects the non-string value %j", (value) => {
    expect(isMediaFolder(value)).toBe(false)
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
