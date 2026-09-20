import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getAssetURL, getBaseURL, resolveAssetURL } from "~/src/lib/url"

import { DEFAULT_APP_URL, DEFAULT_R2_PUBLIC_URL } from "~/src/presentation/branding/app"

const { env } = vi.hoisted(() => ({ env: { VITE_APP_URL: "", VITE_R2_URL: "" } }))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: (fn: unknown) => ({ client: () => fn }) }),
}))

describe("server URLs", () => {
  beforeEach(() => {
    env.VITE_APP_URL = "https://store.test"
    env.VITE_R2_URL = "https://images.test/"
  })

  it("uses the configured public origin for server-rendered links", () => {
    expect(getBaseURL()).toBe("https://store.test")
  })

  it("keeps the development fallback when no origin is configured", () => {
    env.VITE_APP_URL = ""
    expect(getBaseURL()).toBe(DEFAULT_APP_URL)
  })

  it("resolves stored asset keys and legacy paths against the CDN", () => {
    expect(getAssetURL("products/ring.jpg")).toBe("https://images.test/products/ring.jpg")
    expect(resolveAssetURL("/products/ring.jpg")).toBe("https://images.test/products/ring.jpg")
    expect(resolveAssetURL("https://external.test/ring.jpg")).toBe("https://external.test/ring.jpg")
  })

  it("uses the existing bucket fallback for unconfigured asset hosts", () => {
    env.VITE_R2_URL = "https://your-production-cdn-domain.com"
    expect(getAssetURL("ring.jpg")).toBe(`${DEFAULT_R2_PUBLIC_URL}/ring.jpg`)
  })
})
