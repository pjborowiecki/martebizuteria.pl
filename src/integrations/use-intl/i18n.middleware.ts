import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { canonicalizePathname, extractLocaleFromPath, shouldIgnorePath } from "~/src/integrations/use-intl/i18n.paths"
import { parseLocaleCookie } from "~/src/integrations/use-intl/i18n.utils"

const HTTP_MOVED_PERMANENTLY = 301

const HTML_ACCEPT_PATTERN = /(?:^|,)\s*(?:text\/html|application\/xhtml\+xml)(?:\s*;|,|$)/iu

const DOCUMENT_DESTINATIONS = new Set(["document", "frame", "iframe"])

const isDocumentRequest = (request: Request): boolean => {
  const destination = request.headers.get("sec-fetch-dest")

  if (destination !== null) {
    return DOCUMENT_DESTINATIONS.has(destination)
  }

  const accept = request.headers.get("accept")

  return accept === null || HTML_ACCEPT_PATTERN.test(accept)
}

export const resolveLocale = (
  request: Request,
): { readonly redirect?: Response; readonly setCookie?: { readonly name: string; readonly value: string } } => {
  const url = new URL(request.url)
  const { pathname } = url

  if ((request.method !== "GET" && request.method !== "HEAD") || !isDocumentRequest(request) || shouldIgnorePath(pathname)) {
    return {}
  }

  const canonical = canonicalizePathname(pathname)

  if (canonical !== pathname) {
    url.pathname = canonical

    return { redirect: Response.redirect(url.href, HTTP_MOVED_PERMANENTLY) }
  }

  const urlLocale = extractLocaleFromPath(pathname) ?? I18N.DEFAULT_LOCALE
  const cookieLocale = parseLocaleCookie(request.headers.get("cookie")) ?? I18N.DEFAULT_LOCALE

  if (urlLocale === cookieLocale) {
    return {}
  }

  return { setCookie: { name: I18N.COOKIE_NAME, value: urlLocale } }
}
