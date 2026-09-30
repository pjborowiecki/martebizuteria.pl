import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getAssetURL, resolveAssetURL } from "~/src/lib/url"

import { DEFAULT_R2_PUBLIC_URL } from "~/src/presentation/branding/app"

const { env } = vi.hoisted(() => ({ env: { VITE_R2_URL: "" } }))

vi.mock("cloudflare:workers", () => ({ env }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: (fn: unknown) => ({ client: () => fn }) }),
}))

describe("server URLs", () => {
  beforeEach(() => {
    env.VITE_R2_URL = "https://images.test/"
  })

  it("resolves stored asset keys and legacy paths against the CDN", () => {
    expect(getAssetURL("products/ring.jpg")).toBe("https://images.test/products/ring.jpg")
    expect(resolveAssetURL("/products/ring.jpg")).toBe("https://images.test/products/ring.jpg")
    expect(resolveAssetURL("https://external.test/ring.jpg")).toBe("https://external.test/ring.jpg")
  })

  it.each(["http://legacy.test/ring.jpg", "https://external.test/ring.jpg?size=200#preview"])(
    "preserves the existing absolute asset URL %s without prefixing the store CDN",
    (url) => {
      expect(getAssetURL(url)).toBe(url)
    },
  )

  it("uses the existing bucket fallback for unconfigured asset hosts", () => {
    env.VITE_R2_URL = "https://your-production-cdn-domain.com"
    expect(getAssetURL("ring.jpg")).toBe(`${DEFAULT_R2_PUBLIC_URL}/ring.jpg`)
  })
})
