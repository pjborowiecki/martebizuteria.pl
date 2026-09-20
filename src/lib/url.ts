import { env } from "cloudflare:workers"

import { createIsomorphicFn } from "@tanstack/react-start"

import { DEFAULT_APP_URL, DEFAULT_R2_PUBLIC_URL } from "~/src/presentation/branding/app"
const isConfiguredAssetCdnBase = (base: string | undefined): base is string =>
  typeof base === "string" && base !== "" && !base.includes(PLACEHOLDER_CDN_HOST)

export const getAssetURL = (path: string): string => {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path
  }
  return `${getAssetCdnBase()}/${path.replace(/^\//u, "")}`
}

/** Resolve stored R2 keys and legacy relative paths to a public CDN URL. */
export const resolveAssetURL = (pathOrUrl: string): string => {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl
  }
  return getAssetURL(pathOrUrl.replace(/^\//u, ""))
}
export const isAssetCdnUrl = (url: string): boolean => {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    return false
  }
  try {
    const target = new URL(url)
    if (target.hostname.endsWith(".r2.dev")) {
      return true
    }
    const base = new URL(`${getAssetCdnBase()}/`)
    return target.hostname === base.hostname
  } catch {
    return false
  }
}
const PLACEHOLDER_CDN_HOST = "your-production-cdn-domain.com"
export const getAssetCdnBase = createIsomorphicFn()
  .server((): string => {
    if (isConfiguredAssetCdnBase(env.VITE_R2_URL)) {
      return env.VITE_R2_URL.replace(/\/$/u, "")
    }
    return DEFAULT_R2_PUBLIC_URL
  })
  .client((): string => {
    const baseUrl: unknown = import.meta.env["VITE_R2_URL"]
    if (typeof baseUrl === "string" && isConfiguredAssetCdnBase(baseUrl)) {
      return baseUrl.replace(/\/$/u, "")
    }
    return DEFAULT_R2_PUBLIC_URL
  })
export const getBaseURL = createIsomorphicFn()
  .server((): string => env.VITE_APP_URL || DEFAULT_APP_URL)
  .client((): string => {
    const url: unknown = import.meta.env.VITE_APP_URL
    if (typeof url === "string" && url !== "") {
      return url
    }
    return DEFAULT_APP_URL
  })
