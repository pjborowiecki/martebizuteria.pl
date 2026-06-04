import { createIsomorphicFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";

import { CONSTANTS } from "~/src/constants";

const PLACEHOLDER_CDN_HOST = "your-production-cdn-domain.com";

function normalizeAssetPath(path: string): string {
  return `/${path.replace(/^\//u, "")}`;
}

function joinAssetBase(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/$/u, "");
  const cleanPath = path.replace(/^\//u, "");
  return `${cleanBase}/${cleanPath}`;
}

function resolveAssetUrlWithBase(path: string, baseUrl: string | undefined): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  if (typeof baseUrl === "string" && baseUrl !== "") {
    return joinAssetBase(baseUrl, path);
  }

  return normalizeAssetPath(path);
}

function isConfiguredAssetCdnBase(base: string | undefined): base is string {
  return typeof base === "string" && base !== "" && !base.includes(PLACEHOLDER_CDN_HOST);
}

export const getAssetCdnBase = createIsomorphicFn()
  .server((): string => {
    if (isConfiguredAssetCdnBase(env.VITE_R2_URL)) {
      return env.VITE_R2_URL.replace(/\/$/u, "");
    }

    return CONSTANTS.DEFAULT_R2_PUBLIC_URL;
  })
  .client((): string => {
    const baseUrl: unknown = import.meta.env.VITE_R2_URL;
    if (typeof baseUrl === "string" && isConfiguredAssetCdnBase(baseUrl)) {
      return baseUrl.replace(/\/$/u, "");
    }

    return CONSTANTS.DEFAULT_R2_PUBLIC_URL;
  });

export const getBaseURL = createIsomorphicFn()
  .server((): string => CONSTANTS.DEFAULT_APP_URL)
  .client((): string => {
    if (!import.meta.env.PROD) {
      return CONSTANTS.DEFAULT_APP_URL;
    }

    const url: unknown = import.meta.env.VITE_APP_URL;
    if (typeof url === "string") {
      return url;
    }

    return CONSTANTS.DEFAULT_APP_URL;
  });

export const getAssetURL = createIsomorphicFn()
  .server((path: string): string => resolveAssetUrlWithBase(path, getAssetCdnBase()))
  .client((path: string): string => resolveAssetUrlWithBase(path, getAssetCdnBase()));

/** Resolve stored R2 keys and legacy relative paths to a public CDN URL. */
export function resolveAssetURL(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }

  return getAssetURL(pathOrUrl.replace(/^\//u, ""));
}

export function isAssetCdnUrl(url: string): boolean {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false;
  }

  try {
    const target = new URL(url);
    if (target.hostname.endsWith(".r2.dev")) {
      return true;
    }

    const base = new URL(`${getAssetCdnBase()}/`);
    return target.hostname === base.hostname;
  } catch {
    return false;
  }
}
