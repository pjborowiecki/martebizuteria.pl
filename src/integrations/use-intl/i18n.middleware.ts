import { env } from "cloudflare:workers"

import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from "~/src/integrations/use-intl/i18n.config"
import { extractLocaleFromPath, parseLocaleCookie, shouldIgnorePath } from "~/src/integrations/use-intl/i18n.utils"
export const createCookieHeader = (name: string, value: string): string => {
  // Env pins APP_ENV to one literal because cf-typegen runs with --env development, while wrangler.jsonc also sets "preview" and "production".
  const appEnv: string = env.APP_ENV
  const MAX_AGE = 31_536_000
  const directives = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, "Path=/", `Max-Age=${MAX_AGE}`, "SameSite=Lax"]
  if (appEnv !== "development") {
    directives.push("Secure")
  }
  return directives.join("; ")
}
const stripPrefix = (pathname: string, prefix: string): string => {
  const stripped = pathname.slice(prefix.length)
  if (stripped === "") {
    return "/"
  }
  return stripped
}
const buildRedirectTo = (urlString: string, pathname: string): LocaleMiddlewareResponse => {
  const redirectUrl = new URL(urlString)
  redirectUrl.pathname = pathname
  return {
    redirect: Response.redirect(redirectUrl.toString(), HTTP_MOVED_PERMANENTLY),
  }
}
const resolveLocaleForPath = (urlString: string, urlLocale: string, cookieHeader: string | null): LocaleMiddlewareResponse => {
  const { pathname } = new URL(urlString)
  const strippedPath = stripPrefix(pathname, `/${urlLocale}`)
  if (shouldIgnorePath(strippedPath)) {
    return buildRedirectTo(urlString, strippedPath)
  }
  const cookieLocale = parseLocaleCookie(cookieHeader ?? undefined)
  if (urlLocale !== cookieLocale) {
    return {
      setCookie: {
        name: LOCALE_COOKIE_NAME,
        value: urlLocale,
      },
    }
  }
  return {}
}
export const handleLocaleMiddleware = (request: Readonly<LocaleMiddlewareRequest>): LocaleMiddlewareResponse => {
  const { pathname } = new URL(request.url)
  if (shouldIgnorePath(pathname)) {
    return {}
  }
  if (pathname === DEFAULT_LOCALE_PREFIX || pathname.startsWith(DEFAULT_LOCALE_PREFIX_WITH_SLASH)) {
    return buildRedirectTo(request.url, stripPrefix(pathname, DEFAULT_LOCALE_PREFIX))
  }
  const urlLocale = extractLocaleFromPath(pathname)
  if (urlLocale !== undefined) {
    return resolveLocaleForPath(request.url, urlLocale, request.headers.get("cookie"))
  }

  // Auth endpoints read locale from this cookie, including when choosing verification email text.
  const cookieLocale = parseLocaleCookie(request.headers.get("cookie") ?? undefined)
  if (cookieLocale !== DEFAULT_LOCALE) {
    return {
      setCookie: {
        name: LOCALE_COOKIE_NAME,
        value: DEFAULT_LOCALE,
      },
    }
  }
  return {}
}
const DEFAULT_LOCALE_PREFIX = `/${DEFAULT_LOCALE}`
const DEFAULT_LOCALE_PREFIX_WITH_SLASH = `${DEFAULT_LOCALE_PREFIX}/`
const HTTP_MOVED_PERMANENTLY = 301
export interface LocaleMiddlewareRequest {
  readonly url: string
  readonly headers: {
    readonly get: (name: string) => string | null
  }
}
export interface LocaleMiddlewareResponse {
  readonly redirect?: Response
  readonly setCookie?: {
    readonly name: string
    readonly value: string
  }
}
