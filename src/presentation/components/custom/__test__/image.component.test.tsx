import { type ComponentProps } from "react"

import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path.replace(/^\//u, "")}`,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) =>
    pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")
      ? pathOrUrl
      : `https://assets.test/${pathOrUrl.replace(/^\//u, "")}`,
}))

import { APP_URL } from "~/src/presentation/branding/app"

import { Image } from "~/src/presentation/components/custom/image"

const SRC = "/products/silver-ring.avif"

const RESOLVED_SRC = "https://assets.test/products/silver-ring.avif"

const WIDTH = 400

const HEIGHT = 500

const renderImage = (overrides: Partial<ComponentProps<typeof Image>> = {}): HTMLImageElement => {
  renderWithProviders(<Image alt="Silver ring" height={HEIGHT} src={SRC} width={WIDTH} {...overrides} />)

  return screen.getByAltText("Silver ring")
}

afterEach(() => {
  cleanup()
})

describe("Image source resolution", () => {
  it("routes the resolved asset through the image transform at the default quality", () => {
    const source = renderImage().getAttribute("src")

    expect(source).toBe(`${APP_URL}/cdn-cgi/image/width=400,height=500,quality=75,fit=cover,f=auto/${RESOLVED_SRC}`)
  })

  it("only resolves the asset URL when optimization is switched off", () => {
    expect(renderImage({ optimize: false }).getAttribute("src")).toBe(RESOLVED_SRC)
  })

  it("honours an explicit quality over the default", () => {
    expect(renderImage({ quality: 40 }).getAttribute("src")).toContain("quality=40")
  })

  it("applies the same quality to every candidate in the srcset", () => {
    const candidates = renderImage({ quality: 40 }).getAttribute("srcset")?.split(",\n") ?? []

    expect(candidates.length).toBeGreaterThan(1)
    expect(candidates.every((candidate) => candidate.includes("quality=40"))).toBe(true)
  })

  it("leaves a remote source on its own host instead of proxying it", () => {
    const source = renderImage({ src: "https://images.unsplash.com/photo-1" }).getAttribute("src")

    expect(source?.startsWith("https://images.unsplash.com/photo-1")).toBe(true)
    expect(source).not.toContain("cdn-cgi")
  })
})

describe("Image loading priority", () => {
  it("lazy loads and decodes asynchronously by default", () => {
    const image = renderImage()

    expect(image).toHaveAttribute("loading", "lazy")
    expect(image).toHaveAttribute("decoding", "async")
    expect(image).not.toHaveAttribute("fetchpriority")
  })

  it("eagerly loads a priority image and decodes it synchronously", () => {
    const image = renderImage({ priority: true })

    expect(image).toHaveAttribute("loading", "eager")
    expect(image).toHaveAttribute("decoding", "sync")
    expect(image).toHaveAttribute("fetchpriority", "high")
  })

  it("honours an explicit loading mode when the image is not a priority", () => {
    expect(renderImage({ loading: "eager" })).toHaveAttribute("loading", "eager")
  })

  it("lets priority win over an explicit lazy loading mode", () => {
    expect(renderImage({ loading: "lazy", priority: true })).toHaveAttribute("loading", "eager")
  })

  it("lets priority win over an explicit decoding hint", () => {
    expect(renderImage({ decoding: "async", priority: true })).toHaveAttribute("decoding", "sync")
  })

  it("keeps the caller's decoding hint when the image is not a priority", () => {
    expect(renderImage({ decoding: "sync" })).toHaveAttribute("decoding", "sync")
  })
})

describe("Image layout and placeholder", () => {
  it("reserves the declared box so the layout never shifts", () => {
    const { style } = renderImage()

    expect(style.maxWidth).toBe("400px")
    expect(style.maxHeight).toBe("500px")
    expect(style.aspectRatio).toBe("0.8 / 1")
  })

  it("passes the sizes hint through to the browser", () => {
    expect(renderImage({ sizes: "(max-width: 768px) 100vw, 400px" })).toHaveAttribute("sizes", "(max-width: 768px) 100vw, 400px")
  })

  it("paints a blur placeholder behind the image when one is supplied", () => {
    const { style } = renderImage({ blurDataURL: "data:image/png;base64,iVBORw0KGgo=" })

    expect(style.backgroundImage).toContain("data:image/png;base64,iVBORw0KGgo=")
    expect(style.backgroundRepeat).toBe("no-repeat")
  })

  it("paints no placeholder when the product has no blur data url", () => {
    expect(renderImage({ blurDataURL: null }).style.backgroundImage).toBe("")
  })

  it("paints no placeholder when no blur data url is passed at all", () => {
    expect(renderImage().style.backgroundImage).toBe("")
  })

  it("forwards the caller's class name", () => {
    expect(renderImage({ className: "rounded-lg" })).toHaveClass("rounded-lg")
  })
})
