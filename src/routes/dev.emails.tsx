import { createFileRoute } from "@tanstack/react-router";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { EMAIL_PREVIEWS, isEmailPreviewSlug, renderEmailPreview } from "~/src/integrations/resend/email-previews";

import { isValidLocale } from "~/src/lib/_utils/locale";

const PLAIN_TEXT_FORMAT = "text";

function notFound(): Response {
  return new Response("Not found", { status: 404 });
}

function html(body: string): Response {
  return new Response(body, { headers: { "content-type": "text/html; charset=utf-8" } });
}

/** Renders the index: a link grid of every template × locale × format. */
function renderIndex(): Response {
  const cards = Object.entries(EMAIL_PREVIEWS)
    .map(([slug, preview]) => {
      const links = CONSTANTS.LOCALES.flatMap((locale) => [
        `<a href="/dev/emails?template=${slug}&locale=${locale}">${locale.toUpperCase()} HTML</a>`,
        `<a href="/dev/emails?template=${slug}&locale=${locale}&format=${PLAIN_TEXT_FORMAT}">${locale.toUpperCase()} text</a>`
      ]).join("");
      return `<li><strong>${preview.label}</strong><div class="links">${links}</div></li>`;
    })
    .join("");

  return html(
    `<!doctype html><html><head><meta charset="utf-8"><title>Email previews</title>
    <style>
      body{font-family:ui-sans-serif,system-ui,sans-serif;max-width:640px;margin:48px auto;padding:0 24px;color:#09090b}
      h1{font-weight:300;letter-spacing:.1em;text-transform:uppercase}
      ul{list-style:none;padding:0;display:grid;gap:16px}
      li{border:1px solid #e5e7eb;padding:16px 20px;border-radius:8px}
      .links{display:flex;flex-wrap:wrap;gap:12px;margin-top:8px}
      a{color:#2563eb;text-decoration:none;font-size:14px}
      a:hover{text-decoration:underline}
    </style></head>
    <body><h1>M'ARTE — Email previews</h1><ul>${cards}</ul></body></html>`
  );
}

export const Route = createFileRoute("/dev/emails")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Dev-only: this previewer renders templates with mock data and must
        // never be reachable in production.
        if (!import.meta.env.DEV) {
          return notFound();
        }

        const url = new URL(request.url);
        const template = url.searchParams.get("template");

        if (template === null) {
          return renderIndex();
        }

        if (!isEmailPreviewSlug(template)) {
          return notFound();
        }

        const localeParam = url.searchParams.get("locale") ?? "";
        const locale: Locale = isValidLocale(localeParam) ? localeParam : CONSTANTS.DEFAULT_LOCALE;
        const plainText = url.searchParams.get("format") === PLAIN_TEXT_FORMAT;

        const rendered = await renderEmailPreview(template, locale, plainText);

        return new Response(rendered, {
          headers: { "content-type": plainText ? "text/plain; charset=utf-8" : "text/html; charset=utf-8" }
        });
      }
    }
  }
});
