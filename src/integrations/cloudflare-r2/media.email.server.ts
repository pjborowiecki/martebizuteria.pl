import { env } from "cloudflare:workers"

import { Buffer } from "node:buffer"
import { type Attachment } from "resend"

import { isAssetCdnUrl } from "~/src/lib/url"

const BYTES_PER_KIB = 1024

const MAX_INLINE_EMAIL_IMAGE_KIB = 512

const MAX_INLINE_EMAIL_IMAGES_TOTAL_MIB = 2

export const MAX_INLINE_EMAIL_IMAGES = 10

export const MAX_INLINE_EMAIL_IMAGE_BYTES = MAX_INLINE_EMAIL_IMAGE_KIB * BYTES_PER_KIB

export const MAX_INLINE_EMAIL_IMAGES_TOTAL_BYTES = MAX_INLINE_EMAIL_IMAGES_TOTAL_MIB * BYTES_PER_KIB * BYTES_PER_KIB

const objectKeyOf = (url: string): string => new URL(url).pathname.replace(/^\//u, "")

const readImage = async (url: string): Promise<ArrayBuffer | undefined> => {
  try {
    const object = await env.IMAGES.get(objectKeyOf(url))
    if (object === null || object.size > MAX_INLINE_EMAIL_IMAGE_BYTES) {
      return undefined
    }

    return await object.arrayBuffer()
  } catch (error) {
    console.warn(`[Email] Could not read ${url} to embed it, so the email links to it instead`, error)

    return undefined
  }
}

export const embedEmailImages = async (urls: readonly string[]): Promise<InlineEmailImages> => {
  const candidates = [...new Set(urls)].filter((url) => isAssetCdnUrl(url)).slice(0, MAX_INLINE_EMAIL_IMAGES)
  const contents = await Promise.all(candidates.map((url) => readImage(url)))
  const attachments: Attachment[] = []
  const sources = new Map<string, string>()
  let totalBytes = 0
  for (const [index, url] of candidates.entries()) {
    const content = contents[index]
    if (content !== undefined && totalBytes + content.byteLength <= MAX_INLINE_EMAIL_IMAGES_TOTAL_BYTES) {
      totalBytes += content.byteLength
      const contentId = `image-${index + 1}`
      attachments.push({ content: Buffer.from(content).toString("base64"), contentId, filename: objectKeyOf(url).split("/").at(-1) })
      sources.set(url, `cid:${contentId}`)
    }
  }

  return { attachments, sources }
}

export interface InlineEmailImages {
  readonly attachments: readonly Attachment[]
  readonly sources: ReadonlyMap<string, string>
}
