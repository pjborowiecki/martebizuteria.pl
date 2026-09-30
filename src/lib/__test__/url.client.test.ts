import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("cloudflare:workers", () => ({ env: {} }))
vi.mock("@tanstack/react-start", () => ({
  createIsomorphicFn: () => ({ server: () => ({ client: (fn: unknown) => fn }) }),
}))

import { getAssetCdnBase, getAssetURL, isAssetCdnUrl } from "~/src/lib/url"

import { DEFAULT_R2_PUBLIC_URL } from "~/src/presentation/branding/app"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("the browser build of getAssetCdnBase", () => {
  it("uses the bucket origin the bundle was built with", () => {
    vi.stubEnv("VITE_R2_URL", "https://images.browser.test")

    expect(getAssetCdnBase()).toBe("https://images.browser.test")
  })

  it("strips a trailing slash so paths join cleanly", () => {
    vi.stubEnv("VITE_R2_URL", "https://images.browser.test/")

    expect(getAssetURL("products/ring.jpg")).toBe("https://images.browser.test/products/ring.jpg")
  })

  it("falls back to the bundled bucket when the placeholder host survived the build", () => {
    vi.stubEnv("VITE_R2_URL", "https://your-production-cdn-domain.com")

    expect(getAssetCdnBase()).toBe(DEFAULT_R2_PUBLIC_URL)
  })

  it("falls back to the bundled bucket when the variable is empty", () => {
    vi.stubEnv("VITE_R2_URL", "")

    expect(getAssetCdnBase()).toBe(DEFAULT_R2_PUBLIC_URL)
  })

  it("falls back when the build did not define a bucket URL", () => {
    vi.stubEnv("VITE_R2_URL", undefined)

    expect(getAssetCdnBase()).toBe(DEFAULT_R2_PUBLIC_URL)
  })

  it("still recognises its own bucket origin in the browser", () => {
    vi.stubEnv("VITE_R2_URL", "https://images.browser.test")

    expect(isAssetCdnUrl("https://images.browser.test/products/ring.jpg")).toBe(true)
    expect(isAssetCdnUrl("https://elsewhere.test/products/ring.jpg")).toBe(false)
  })
})
