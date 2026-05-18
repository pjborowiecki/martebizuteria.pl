import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

export interface ReadonlyUrl {
  readonly pathname: string;
  readonly search: string;
  readonly hash: string;
  readonly host: string;
  readonly origin: string;
  readonly href: string;
  readonly toString: () => string;
}

const IGNORED_PATHS_REGEX = /^\/(?:api|rpc)(?:\/|$)/u;
const LOCALE_SEGMENT_REGEX = /^\/([a-z]{2})(?:\/|$)/u;

const COOKIE_LOCALE_REGEX = new RegExp(String.raw`(?:^|;\s*)${CONSTANTS.LOCALE_COOKIE_NAME}=([^;]*)`, "u");

const LOCALE_SET = new Set<string>(CONSTANTS.LOCALES);

export function isValidLocale(locale: string): locale is Locale {
  return LOCALE_SET.has(locale);
}

export function shouldIgnorePath(pathname: string): boolean {
  return IGNORED_PATHS_REGEX.test(pathname);
}

export function extractLocaleFromPath(pathname: string): Locale | undefined {
  const [, segment] = LOCALE_SEGMENT_REGEX.exec(pathname) ?? [];

  if (segment !== undefined && isValidLocale(segment) && segment !== CONSTANTS.DEFAULT_LOCALE) {
    return segment;
  }

  return undefined;
}

export function parseLocaleCookie(cookieHeader: string | undefined): Locale | undefined {
  if (cookieHeader === undefined) {
    return undefined;
  }

  const [, rawSegment] = COOKIE_LOCALE_REGEX.exec(cookieHeader) ?? [];

  if (rawSegment === undefined) {
    return undefined;
  }

  const potentialLocale = decodeURIComponent(rawSegment);
  if (isValidLocale(potentialLocale)) {
    return potentialLocale;
  }

  return undefined;
}

function buildLocalizedPathname(pathname: string, locale: string): string {
  if (pathname === "/") {
    return `/${locale}`;
  }
  return `/${locale}${pathname}`;
}

function normalizeStrippedPath(strippedPath: string): string {
  if (strippedPath === "") {
    return "/";
  }
  return strippedPath;
}

export function localizeUrl(url: ReadonlyUrl): URL {
  const locale = getCurrentLocale();

  if (shouldIgnorePath(url.pathname) || locale === CONSTANTS.DEFAULT_LOCALE || extractLocaleFromPath(url.pathname) !== undefined) {
    return new URL(url.toString());
  }

  const newUrl = new URL(url.toString());
  newUrl.pathname = buildLocalizedPathname(url.pathname, locale);
  return newUrl;
}

export function deLocalizeUrl(url: ReadonlyUrl): URL {
  const locale = extractLocaleFromPath(url.pathname);

  if (locale === undefined) {
    return new URL(url.toString());
  }

  const localePrefix = `/${locale}`;
  const strippedPath = url.pathname.slice(localePrefix.length);
  const newUrl = new URL(url.toString());
  newUrl.pathname = normalizeStrippedPath(strippedPath);
  return newUrl;
}

export const getCurrentLocale = createIsomorphicFn()
  .server((routerPathname?: string): Locale => {
    const request = getRequest();
    const url = new URL(request.url);

    const pathname = routerPathname ?? url.pathname;

    if (shouldIgnorePath(pathname)) {
      const cookie = request.headers.get("cookie") ?? undefined;
      return parseLocaleCookie(cookie) ?? CONSTANTS.DEFAULT_LOCALE;
    }

    return extractLocaleFromPath(pathname) ?? CONSTANTS.DEFAULT_LOCALE;
  })
  .client((routerPathname?: string): Locale => {
    const pathname = routerPathname ?? globalThis.location.pathname;

    if (shouldIgnorePath(pathname)) {
      return parseLocaleCookie(document.cookie) ?? CONSTANTS.DEFAULT_LOCALE;
    }

    return extractLocaleFromPath(pathname) ?? CONSTANTS.DEFAULT_LOCALE;
  });
