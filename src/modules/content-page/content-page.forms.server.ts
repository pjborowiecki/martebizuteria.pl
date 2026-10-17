import { env } from "cloudflare:workers"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { readSellerDetails } from "~/src/modules/store-setting/store-setting.accessors"

import { FORM_FONT_PATHS, type FormFonts, type FormTemplate } from "~/src/presentation/pdf/form-document"

const FORM_CACHE_CONTROL = "public, max-age=300, must-revalidate"

const readFormFont = async (origin: string, path: string): Promise<Uint8Array> => {
  const response = await env.ASSETS.fetch(new URL(path, origin))
  if (!response.ok) {
    throw new Error(`The form font ${path} could not be read from the static assets: HTTP ${response.status}`)
  }

  return new Uint8Array(await response.arrayBuffer())
}

export const loadFormFonts = async (origin: string): Promise<FormFonts> => {
  const [sans, sansSemiBold, serifSemiBold] = await Promise.all([
    readFormFont(origin, FORM_FONT_PATHS.sans),
    readFormFont(origin, FORM_FONT_PATHS.sansSemiBold),
    readFormFont(origin, FORM_FONT_PATHS.serifSemiBold),
  ])

  return { sans, sansSemiBold, serifSemiBold }
}

const holdsCurrentCopy = (request: Request, etag: string): boolean =>
  request.headers
    .get("if-none-match")
    ?.split(",")
    .some((tag) => [etag, `W/${etag}`, "*"].includes(tag.trim())) === true

export const respondWithForm = async (request: Request, form: FormTemplate): Promise<Response> => {
  const seller = await readSellerDetails()
  const headers = { "Cache-Control": FORM_CACHE_CONTROL, ETag: `"${seller.updatedAt.getTime()}"` }
  if (holdsCurrentCopy(request, headers.ETag)) {
    return new Response(undefined, { headers, status: HTTP_STATUS.NOT_MODIFIED })
  }

  const pdf = await form.render(seller, await loadFormFonts(new URL(request.url).origin))

  return new Response(pdf, {
    headers: { ...headers, "Content-Disposition": `inline; filename="${form.fileName}"`, "Content-Type": "application/pdf" },
  })
}
