import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getOptimizedImageUrl } from "~/src/lib/image"
import { withSecurityHeaders } from "~/src/lib/security-headers"
import { getAssetURL, resolveAssetURL } from "~/src/lib/url"

import { DEFAULT_R2_PUBLIC_URL } from "~/src/presentation/branding/app"

const { env } = vi.hoisted(() => ({ env: { VITE_R2_URL: "https://images.martebizuteria.pl" } }))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({
    client: (fn: unknown) => fn,
    server: (fn: unknown) => ({ client: () => fn }),
  }),
}))

const PRODUCTION_IMAGE_HOST = "https://images.martebizuteria.pl"

const PREVIEW_BUCKET_HOST = "https://pub-0123456789abcdef0123456789abcdef.r2.dev"

const TEST_IMAGE_HOST = "https://images.example.test"

const PRODUCT_KEY = "products/0f3a.webp"

const directive = (appEnv: string, name: string): readonly string[] => {
  const entry = withSecurityHeaders(new Response("<html></html>"), { appEnv, nonce: "bm9uY2U=", protocol: "https:" })
    .headers.get("content-security-policy")
    ?.split("; ")
    .find((candidate) => candidate.startsWith(`${name} `))

  if (entry === undefined) {
    throw new Error(`the ${appEnv} policy has no ${name} directive`)
  }

  return entry.split(" ").slice(1)
}

const allows = (sources: readonly string[], url: string, pageOrigin: string): boolean => {
  const target = new URL(url)

  return sources.some((source) =>
    source === "'self'" ? target.origin === pageOrigin : URL.canParse(source) && new URL(source).origin === target.origin,
  )
}

const catalogueImage = (src: string): string => getOptimizedImageUrl({ height: 750, quality: 75, src, width: 600 })

describe.each([
  ["production", "https://martebizuteria.pl", PRODUCTION_IMAGE_HOST],
  ["preview", "https://preview.martebizuteria.pl", PREVIEW_BUCKET_HOST],
  ["test", "http://127.0.0.1:3000", TEST_IMAGE_HOST],
])("the %s policy and the images the storefront asks for", (appEnv, pageOrigin, imageHost) => {
  beforeEach(() => {
    env.VITE_R2_URL = imageHost
  })

  it("allows a catalogue image resized from a stored key, and the original it redirects to when it cannot be resized", () => {
    const images = directive(appEnv, "img-src")

    expect(allows(images, catalogueImage(PRODUCT_KEY), pageOrigin)).toBe(true)
    expect(allows(images, getAssetURL(PRODUCT_KEY), pageOrigin)).toBe(true)
  })

  it("allows an image whose row still holds the production bucket's r2.dev URL, which is read from the configured host", () => {
    const stored = `${DEFAULT_R2_PUBLIC_URL}/${PRODUCT_KEY}`

    expect(resolveAssetURL(stored)).toBe(`${imageHost}/${PRODUCT_KEY}`)
    expect(allows(directive(appEnv, "img-src"), catalogueImage(stored), pageOrigin)).toBe(true)
  })

  it("allows the landing-page video from the configured host", () => {
    expect(allows(directive(appEnv, "media-src"), getAssetURL("marketing/hero.mp4"), pageOrigin)).toBe(true)
  })
})

describe("the production image host", () => {
  beforeEach(() => {
    env.VITE_R2_URL = PRODUCTION_IMAGE_HOST
  })

  it("resizes through /cdn-cgi/image/ on the custom domain, which the policy lists as a whole origin", () => {
    expect(catalogueImage(PRODUCT_KEY)).toMatch(
      /^https:\/\/images\.martebizuteria\.pl\/cdn-cgi\/image\/.*onerror=redirect.*\/products\/0f3a\.webp$/u,
    )
    expect(directive("production", "img-src")).toContain(PRODUCTION_IMAGE_HOST)
    expect(directive("production", "media-src")).toContain(PRODUCTION_IMAGE_HOST)
  })
})
