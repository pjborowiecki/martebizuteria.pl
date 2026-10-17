import { env } from "cloudflare:workers"

import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { MIME_EXTENSION, uploadImageInputSchema } from "~/src/integrations/cloudflare-r2/media.zod"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { recordImageUploadedAudit } from "~/src/modules/audit-log/audit-log.events.server"

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
  .validator((data: FormData) => {
    const parsed = uploadImageInputSchema.safeParse(data)
    if (!parsed.success) {
      throw new AppError(ERROR_CODES.VALIDATION, parsed.error.issues[0]?.message)
    }

    return parsed.data
  })
  .handler(async ({ data: { file, folder } }) => {
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
    recordImageUploadedAudit(key, { detail: file.name })

    return {
      key,
    }
  })
