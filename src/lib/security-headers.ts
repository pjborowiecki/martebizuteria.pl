import { INPOST_POINTS_API_ORIGIN } from "~/src/integrations/inpost/inpost.constants"

import { isLocalMode } from "~/src/modules/_core/constants/api"

import { getAssetCdnBase } from "~/src/lib/url"

import { DEFAULT_R2_PUBLIC_URL } from "~/src/presentation/branding/app"

const NONCE_BYTE_LENGTH = 16

const STRICT_TRANSPORT_SECURITY = "max-age=31536000; includeSubDomains"

const PERMISSIONS_POLICY = "camera=(), geolocation=(), microphone=()"

const STRIPE_JS_ORIGINS = ["https://js.stripe.com", "https://*.js.stripe.com"] as const

const STRIPE_THREE_D_SECURE_ORIGIN = "https://hooks.stripe.com"

const STRIPE_API_ORIGIN = "https://api.stripe.com"

const STRIPE_ELEMENTS_FONT_STYLESHEET_ORIGIN = "https://fonts.googleapis.com"

const LOCKER_MAP_ORIGINS = ["https://basemaps.cartocdn.com", "https://*.basemaps.cartocdn.com"] as const

export const createContentSecurityPolicyNonce = (): string => {
  const randomBytes = crypto.getRandomValues(new Uint8Array(NONCE_BYTE_LENGTH))

  return btoa(String.fromCodePoint(...randomBytes))
}

const imageHostOrigins = (): string[] => [...new Set([DEFAULT_R2_PUBLIC_URL, getAssetCdnBase()].map((base) => new URL(base).origin))]

const contentSecurityPolicy = (nonce: string): string => {
  const imageHosts = imageHostOrigins()
  const directives: Readonly<Record<string, readonly string[]>> = {
    "base-uri": ["'none'"],
    "connect-src": ["'self'", STRIPE_API_ORIGIN, STRIPE_ELEMENTS_FONT_STYLESHEET_ORIGIN, INPOST_POINTS_API_ORIGIN, ...LOCKER_MAP_ORIGINS],
    "default-src": ["'self'"],
    "font-src": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
    "frame-src": [...STRIPE_JS_ORIGINS, STRIPE_THREE_D_SECURE_ORIGIN],
    "img-src": ["'self'", "data:", "blob:", ...imageHosts],
    "media-src": ["'self'", ...imageHosts],
    "object-src": ["'none'"],
    "script-src": ["'self'", `'nonce-${nonce}'`, ...STRIPE_JS_ORIGINS],
    "style-src": ["'self'", "'unsafe-inline'"],
    "worker-src": ["'self'"],
  }

  return Object.entries(directives)
    .map(([directive, sources]) => [directive, ...sources].join(" "))
    .join("; ")
}

interface SecurityHeadersOptions {
  readonly appEnv: string
  readonly nonce: string
  readonly protocol: string
}

export const withSecurityHeaders = (response: Response, { appEnv, nonce, protocol }: SecurityHeadersOptions): Response => {
  const secured = new Response(response.body, response)
  secured.headers.set("Content-Security-Policy", contentSecurityPolicy(nonce))
  secured.headers.set("Permissions-Policy", PERMISSIONS_POLICY)
  secured.headers.set("Referrer-Policy", "strict-origin-when-cross-origin")
  secured.headers.set("X-Content-Type-Options", "nosniff")
  secured.headers.set("X-Frame-Options", "DENY")

  if (!isLocalMode(appEnv) && protocol === "https:") {
    secured.headers.set("Strict-Transport-Security", STRICT_TRANSPORT_SECURITY)
  }

  return secured
}
