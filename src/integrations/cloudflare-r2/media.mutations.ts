import { env } from "cloudflare:workers"

import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import {
  MAX_IMAGE_BYTES,
  MEDIA_ERROR_CODES,
  MIME_EXTENSION,
  isAcceptedImageMime,
  isMediaFolder,
} from "~/src/integrations/cloudflare-r2/media.zod"

import { getAssetURL } from "~/src/lib/url"

const bufferToHex = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer)
  let hex = ""
  for (const byte of bytes) {
    hex += byte.toString(HEX_RADIX).padStart(HEX_PAIR_LENGTH, "0")
  }

  return hex
}

const IMMUTABLE_CACHE_CONTROL = "public, max-age=31536000, immutable"

const HEX_RADIX = 16

const HEX_PAIR_LENGTH = 2

export const uploadImageFn = createServerFn({
  method: "POST",
})
  .middleware([authorized({ product: ["update"] })])
  .validator((data: FormData) => data)
  .handler(async ({ data }) => {
    const file = data.get("file")
    if (!(file instanceof File)) {
      throw new TypeError(MEDIA_ERROR_CODES.INVALID_FILE)
    }

    if (!isAcceptedImageMime(file.type)) {
      throw new Error(MEDIA_ERROR_CODES.INVALID_TYPE)
    }

    if (file.size === 0 || file.size > MAX_IMAGE_BYTES) {
      throw new Error(MEDIA_ERROR_CODES.TOO_LARGE)
    }

    const folderRaw = data.get("folder")
    const folder: string = isMediaFolder(folderRaw) ? folderRaw : "uploads"
    const buffer = await file.arrayBuffer()
    const digest = await crypto.subtle.digest("SHA-256", buffer)
    const key = `${folder}/${bufferToHex(digest)}.${MIME_EXTENSION[file.type]}`
    if ((await env.IMAGES.head(key)) === null) {
      await env.IMAGES.put(key, buffer, {
        httpMetadata: {
          cacheControl: IMMUTABLE_CACHE_CONTROL,
          contentType: file.type,
        },
      })
    }

    return {
      key,
      url: getAssetURL(key),
    }
  })
