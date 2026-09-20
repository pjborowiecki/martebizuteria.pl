import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { DEFAULT_LOCALE, LOCALES, LOCALE_COOKIE_NAME } from "~/src/integrations/use-intl/i18n.config"
import { type Locale } from "~/src/integrations/use-intl/i18n.types"
export const isValidLocale = (locale: string): locale is Locale => LOCALE_SET.has(locale)

export const shouldIgnorePath = (pathname: string): boolean => IGNORED_PATHS_REGEX.test(pathname)

export const extractLocaleFromPath = (pathname: string): Locale | undefined => {
  const [, segment] = LOCALE_SEGMENT_REGEX.exec(pathname) ?? []
  if (segment !== undefined && isValidLocale(segment) && segment !== DEFAULT_LOCALE) {
    return segment
  }
  return undefined
}
export const parseLocaleCookie = (cookieHeader: string | undefined): Locale | undefined => {
  if (cookieHeader === undefined) {
    return undefined
  }
  const [, rawSegment] = COOKIE_LOCALE_REGEX.exec(cookieHeader) ?? []
  if (rawSegment === undefined) {
    return undefined
  }
  try {
    const locale = decodeURIComponent(rawSegment)
    return isValidLocale(locale) ? locale : undefined
  } catch {
    return undefined
  }
}
export const deLocalizeUrl = (url: ReadonlyUrl): URL => {
  const locale = extractLocaleFromPath(url.pathname)
  if (locale === undefined) {
    return new URL(url.toString())
  }
  const localePrefix = `/${locale}`
  const strippedPath = url.pathname.slice(localePrefix.length)
  const newUrl = new URL(url.toString())
  newUrl.pathname = strippedPath || "/"
  return newUrl
}
type ReadonlyUrl = Pick<URL, "pathname" | "toString">
const IGNORED_PATHS_REGEX = /^\/(?:api|rpc|_serverFn|assets)(?:\/|$)/u
const LOCALE_SEGMENT_REGEX = /^\/(?<locale>[a-z]{2})(?:\/|$)/u
const COOKIE_LOCALE_REGEX = new RegExp(String.raw`(?:^|;\s*)${LOCALE_COOKIE_NAME}=([^;]*)`, "u")
const LOCALE_SET = new Set<string>(LOCALES)
export const getCurrentLocale = createIsomorphicFn()
  .server((routerPathname?: string): Locale => {
    const request = getRequest()
    const url = new URL(request.url)
    const pathname = routerPathname ?? url.pathname
    if (shouldIgnorePath(pathname)) {
      const cookie = request.headers.get("cookie") ?? undefined
      return parseLocaleCookie(cookie) ?? DEFAULT_LOCALE
    }
    return extractLocaleFromPath(pathname) ?? DEFAULT_LOCALE
  })
  .client((routerPathname?: string): Locale => {
    const pathname = routerPathname ?? globalThis.location.pathname
    if (shouldIgnorePath(pathname)) {
      return parseLocaleCookie(document.cookie) ?? DEFAULT_LOCALE
    }
    return extractLocaleFromPath(pathname) ?? DEFAULT_LOCALE
  })
