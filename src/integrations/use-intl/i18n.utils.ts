import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import {
  deLocalizePathname,
  extractLocaleFromPath,
  isSupportedLocale,
  localizePathname,
  shouldIgnorePath,
} from "~/src/integrations/use-intl/i18n.paths"

import { readCookie } from "~/src/lib/cookie"

const withPathname = ({ pathname, url }: { pathname: string; url: URL }): URL => {
  const rewritten = new URL(url)
  rewritten.pathname = pathname

  return rewritten
}

export const parseLocaleCookie = (cookieHeader: string | null | undefined): SupportedLocale | undefined => {
  const locale = readCookie({ header: cookieHeader, name: I18N.COOKIE_NAME })

  return locale !== undefined && isSupportedLocale(locale) ? locale : undefined
}

export const getCurrentPathname = createIsomorphicFn()
  .server((): string => deLocalizePathname(new URL(getRequest().url).pathname))
  .client((): string => deLocalizePathname(globalThis.location.pathname))

export const getCurrentLocale = createIsomorphicFn()
  .server((): SupportedLocale => {
    const request = getRequest()
    const { pathname } = new URL(request.url)

    if (shouldIgnorePath(pathname)) {
      return parseLocaleCookie(request.headers.get("cookie")) ?? I18N.DEFAULT_LOCALE
    }

    return extractLocaleFromPath(pathname) ?? I18N.DEFAULT_LOCALE
  })
  .client((): SupportedLocale => {
    const { pathname } = globalThis.location

    if (shouldIgnorePath(pathname)) {
      return parseLocaleCookie(document.cookie) ?? I18N.DEFAULT_LOCALE
    }

    return extractLocaleFromPath(pathname) ?? I18N.DEFAULT_LOCALE
  })

export const localizeUrl = (url: URL): URL =>
  withPathname({ pathname: localizePathname({ locale: getCurrentLocale(), pathname: url.pathname }), url })

export const deLocalizeUrl = (url: URL): URL => withPathname({ pathname: deLocalizePathname(url.pathname), url })
