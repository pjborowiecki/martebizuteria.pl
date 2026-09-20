import { createFileRoute } from "@tanstack/react-router"

import { EMAIL_PREVIEWS, isEmailPreviewSlug, renderEmailPreview } from "~/src/integrations/resend/email-previews"
import { DEFAULT_LOCALE, LOCALES } from "~/src/integrations/use-intl/i18n.config"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"
import { isValidLocale } from "~/src/integrations/use-intl/i18n.utils"
const notFound = (): Response =>
  new Response("Not found", {
    status: 404,
  })

const html = (body: string): Response =>
  new Response(body, {
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  })

const renderIndex = (): Response => {
  const cards = Object.entries(EMAIL_PREVIEWS)
    .map(([slug, preview]) => {
      const links = LOCALES.flatMap((locale) => [
        `<a href="/dev/emails?template=${slug}&locale=${locale}">${locale.toUpperCase()} HTML</a>`,
        `<a href="/dev/emails?template=${slug}&locale=${locale}&format=${PLAIN_TEXT_FORMAT}">${locale.toUpperCase()} text</a>`,
      ]).join("")
      return `<li><strong>${preview.label}</strong><div class="links">${links}</div></li>`
    })
    .join("")
  return html(`<!doctype html><html><head><meta charset="utf-8"><title>Email previews</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 24px;color:#09090b}
      h1{font-weight:300;letter-spacing:.1em;text-transform:uppercase}
      ul{list-style:none;padding:0;display:grid;gap:16px}
      li{border:1px solid #e5e7eb;padding:16px 20px;border-radius:8px}
      .links{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
      a{color:#2563eb;text-decoration:none;font-size:14px}
      a:hover{text-decoration:underline}
    </style></head>
    <body><h1>M'ARTE — Email previews</h1><ul>${cards}</ul></body></html>`)
}
const PLAIN_TEXT_FORMAT = "text"
export const Route = createFileRoute("/dev/emails")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!import.meta.env.DEV) {
          return notFound()
        }
        const url = new URL(request.url)
        const template = url.searchParams.get("template")
        if (template === null) {
          return renderIndex()
        }
        if (!isEmailPreviewSlug(template)) {
          return notFound()
        }
        const localeParam = url.searchParams.get("locale") ?? ""
        const locale: Locale = isValidLocale(localeParam) ? localeParam : DEFAULT_LOCALE
        const plainText = url.searchParams.get("format") === PLAIN_TEXT_FORMAT
        const rendered = await renderEmailPreview(template, locale, plainText)
        return new Response(rendered, {
          headers: {
            "content-type": plainText ? "text/plain; charset=utf-8" : "text/html; charset=utf-8",
          },
        })
      },
    },
  },
})
