import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createContentSecurityPolicyNonce, withSecurityHeaders } from "~/src/lib/security-headers"

import { DEFAULT_R2_PUBLIC_URL } from "~/src/presentation/branding/app"

const assetCdn = vi.hoisted(() => ({ base: "https://images.marte.test" }))

vi.mock("~/src/lib/url", () => ({ getAssetCdnBase: () => assetCdn.base }))

const NONCE = "cmVxdWVzdC1ub25jZQ=="

const DEPLOYED = { appEnv: "production", nonce: NONCE, protocol: "https:" }

const secured = (options = DEPLOYED, response = new Response("<html></html>", { headers: { "content-type": "text/html" } })) =>
  withSecurityHeaders(response, options)

const directive = (response: Response, name: string): string[] => {
  const policy = response.headers.get("content-security-policy")

  if (policy === null) {
    throw new Error("the response carries no Content-Security-Policy")
  }

  const entry = policy.split("; ").find((candidate) => candidate.split(" ")[0] === name)

  if (entry === undefined) {
    throw new Error(`the policy has no ${name} directive`)
  }

  return entry.split(" ").slice(1)
}

beforeEach(() => {
  assetCdn.base = "https://images.marte.test"
})

describe("createContentSecurityPolicyNonce", () => {
  it("draws 128 random bits encoded as base64", () => {
    const nonce = createContentSecurityPolicyNonce()

    expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/u)
    expect(atob(nonce)).toHaveLength(16)
  })

  it("draws a fresh nonce for every response", () => {
    expect(createContentSecurityPolicyNonce()).not.toBe(createContentSecurityPolicyNonce())
  })
})

describe("withSecurityHeaders", () => {
  it("keeps the status, body and headers the response already had", async () => {
    const response = secured(DEPLOYED, new Response("created", { headers: { "cache-control": "no-store" }, status: 201 }))

    expect(response.status).toBe(201)
    expect(response.headers.get("cache-control")).toBe("no-store")
    await expect(response.text()).resolves.toBe("created")
  })

  it("adds headers to a response whose own headers are immutable", () => {
    const response = secured(DEPLOYED, Response.redirect("https://marte.test/products", 301))

    expect(response.status).toBe(301)
    expect(response.headers.get("location")).toBe("https://marte.test/products")
    expect(response.headers.get("x-frame-options")).toBe("DENY")
  })

  it("stops browsers from sniffing content types, leaking full referrers and framing the shop", () => {
    const response = secured()

    expect(response.headers.get("x-content-type-options")).toBe("nosniff")
    expect(response.headers.get("referrer-policy")).toBe("strict-origin-when-cross-origin")
    expect(response.headers.get("x-frame-options")).toBe("DENY")
    expect(directive(response, "frame-ancestors")).toStrictEqual(["'none'"])
  })

  it("turns off the camera, microphone and location for the shop and everything it embeds", () => {
    expect(secured().headers.get("permissions-policy")).toBe("camera=(), geolocation=(), microphone=()")
  })

  it("runs only the shop's own scripts, the inline scripts carrying this response's nonce, Stripe.js and Turnstile", () => {
    expect(directive(secured(), "script-src")).toStrictEqual([
      "'self'",
      `'nonce-${NONCE}'`,
      "https://js.stripe.com",
      "https://*.js.stripe.com",
      "https://challenges.cloudflare.com",
    ])
  })

  it("never allows eval or inline event handlers", () => {
    const policy = secured().headers.get("content-security-policy")

    expect(policy).not.toContain("unsafe-eval")
    expect(directive(secured(), "script-src")).not.toContain("'unsafe-inline'")
  })

  it("allows inline styles without a nonce, because a nonce source would switch 'unsafe-inline' off", () => {
    expect(directive(secured(), "style-src")).toStrictEqual(["'self'", "'unsafe-inline'"])
  })

  it("frames only Stripe's payment and 3-D Secure frames and the Turnstile challenge", () => {
    expect(directive(secured(), "frame-src")).toStrictEqual([
      "https://js.stripe.com",
      "https://*.js.stripe.com",
      "https://hooks.stripe.com",
      "https://challenges.cloudflare.com",
    ])
  })

  it("connects only to the shop, Stripe, Turnstile, the InPost points API and the locker map tiles", () => {
    expect(directive(secured(), "connect-src")).toStrictEqual([
      "'self'",
      "https://api.stripe.com",
      "https://fonts.googleapis.com",
      "https://challenges.cloudflare.com",
      "https://api-pl-points.easypack24.net",
      "https://basemaps.cartocdn.com",
      "https://*.basemaps.cartocdn.com",
    ])
  })

  it("loads images and video from the shop, the bundled bucket and the configured image host", () => {
    const response = secured()

    expect(directive(response, "img-src")).toStrictEqual(["'self'", "data:", "blob:", DEFAULT_R2_PUBLIC_URL, "https://images.marte.test"])
    expect(directive(response, "media-src")).toStrictEqual(["'self'", DEFAULT_R2_PUBLIC_URL, "https://images.marte.test"])
  })

  it("allows the image host by origin when it is configured with a path", () => {
    assetCdn.base = "https://cdn.marte.test/catalog"

    expect(directive(secured(), "img-src")).toContain("https://cdn.marte.test")
  })

  it("lists the bundled bucket once when it is also the configured image host", () => {
    assetCdn.base = DEFAULT_R2_PUBLIC_URL

    expect(directive(secured(), "media-src")).toStrictEqual(["'self'", DEFAULT_R2_PUBLIC_URL])
  })

  it("keeps fonts, workers and everything else on the shop's own origin", () => {
    const response = secured()

    expect(directive(response, "default-src")).toStrictEqual(["'self'"])
    expect(directive(response, "font-src")).toStrictEqual(["'self'"])
    expect(directive(response, "worker-src")).toStrictEqual(["'self'"])
    expect(directive(response, "form-action")).toStrictEqual(["'self'"])
    expect(directive(response, "object-src")).toStrictEqual(["'none'"])
    expect(directive(response, "base-uri")).toStrictEqual(["'none'"])
  })

  it.each(["production", "preview"])("pins HTTPS for a year, subdomains included, on %s", (appEnv) => {
    expect(secured({ ...DEPLOYED, appEnv }).headers.get("strict-transport-security")).toBe("max-age=31536000; includeSubDomains")
  })

  it.each(["development", "test"])("never pins HTTPS for the local %s environment", (appEnv) => {
    expect(secured({ ...DEPLOYED, appEnv }).headers.has("strict-transport-security")).toBe(false)
  })

  it("never pins HTTPS for a deployed build served over plain HTTP on this machine", () => {
    expect(secured({ ...DEPLOYED, appEnv: "preview", protocol: "http:" }).headers.has("strict-transport-security")).toBe(false)
  })
})
