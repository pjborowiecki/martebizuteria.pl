import { env } from "cloudflare:workers";

import { CONSTANTS } from "~/src/constants";

import { extractLocaleFromPath, parseLocaleCookie, shouldIgnorePath } from "~/src/lib/utils";

const DEFAULT_LOCALE_PREFIX = `/${CONSTANTS.DEFAULT_LOCALE}`;
const DEFAULT_LOCALE_PREFIX_WITH_SLASH = `${DEFAULT_LOCALE_PREFIX}/`;
const HTTP_MOVED_PERMANENTLY = 301;

export interface LocaleMiddlewareRequest {
  readonly url: string;
  readonly headers: {
    readonly get: (name: string) => string | null;
  };
}

export interface LocaleMiddlewareResponse {
  readonly redirect?: Response;
  readonly setCookie?: { readonly name: string; readonly value: string };
}

export function createCookieHeader(name: string, value: string): string {
  const IS_PROD = env.APP_ENV !== "development";
  const MAX_AGE = 31_536_000;

  const directives = [`${encodeURIComponent(name)}=${encodeURIComponent(value)}`, "Path=/", `Max-Age=${MAX_AGE}`, "SameSite=Lax"];

  if (IS_PROD) {
    directives.push("Secure");
  }

  return directives.join("; ");
}

function stripPrefix(pathname: string, prefix: string): string {
  const stripped = pathname.slice(prefix.length);
  if (stripped === "") {
    return "/";
  }
  return stripped;
}

function buildRedirectTo(urlString: string, pathname: string): LocaleMiddlewareResponse {
  const redirectUrl = new URL(urlString);
  redirectUrl.pathname = pathname;
  return { redirect: Response.redirect(redirectUrl.toString(), HTTP_MOVED_PERMANENTLY) };
}

function resolveLocaleForPath(urlString: string, urlLocale: string, cookieHeader: string | null): LocaleMiddlewareResponse {
  const { pathname } = new URL(urlString);
  const strippedPath = stripPrefix(pathname, `/${urlLocale}`);

  if (shouldIgnorePath(strippedPath)) {
    return buildRedirectTo(urlString, strippedPath);
  }

  const cookieLocale = parseLocaleCookie(cookieHeader ?? undefined);
  if (urlLocale !== cookieLocale) {
    return {
      setCookie: {
        name: CONSTANTS.LOCALE_COOKIE_NAME,
        value: urlLocale
      }
    };
  }

  return {};
}

export function handleLocaleMiddleware(request: Readonly<LocaleMiddlewareRequest>): LocaleMiddlewareResponse {
  const { pathname } = new URL(request.url);

  if (shouldIgnorePath(pathname)) {
    return {};
  }

  if (pathname === DEFAULT_LOCALE_PREFIX || pathname.startsWith(DEFAULT_LOCALE_PREFIX_WITH_SLASH)) {
    return buildRedirectTo(request.url, stripPrefix(pathname, DEFAULT_LOCALE_PREFIX));
  }

  const urlLocale = extractLocaleFromPath(pathname);
  if (urlLocale !== undefined) {
    return resolveLocaleForPath(request.url, urlLocale, request.headers.get("cookie"));
  }

  return {};
}
