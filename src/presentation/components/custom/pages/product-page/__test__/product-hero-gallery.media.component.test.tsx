import { renderToString } from "react-dom/server"

import { QueryClient } from "@tanstack/react-query"
import { cleanup } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

vi.mock("~/src/lib/url", () => ({
  getAssetCdnBase: () => "https://images.test",
  getAssetURL: (path: string) => `https://images.test/${path}`,
  getBaseURL: () => "https://store.test",
  isAssetCdnUrl: (url: string) => url.startsWith("https://images.test"),
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))

import { TestProviders, createTestRouter, renderWithProviders } from "~/src/platform/testing/lib/render"

import { ProductHeroGallery } from "~/src/presentation/components/custom/pages/product-page/product-hero-gallery"

const TITLE = "Serenity necklace"

const images = (count: number): string[] =>
  Array.from({ length: count }, (_, index) => `https://images.test/products/serenity-${String(index)}.webp`)

const layoutImages = (container: HTMLElement, layoutSelector: string): HTMLImageElement[] => [
  ...container.querySelectorAll<HTMLImageElement>(`${layoutSelector} img`),
]

const resourceOf = (image: HTMLImageElement | undefined): readonly (string | null | undefined)[] => [
  image?.getAttribute("src"),
  image?.getAttribute("srcset"),
  image?.getAttribute("sizes"),
]

const serverHtml = (count: number): string =>
  renderToString(
    <TestProviders queryClient={new QueryClient()} router={createTestRouter()}>
      <ProductHeroGallery images={images(count)} title={TITLE} />
    </TestProviders>,
  )

afterEach(() => {
  cleanup()
})

describe.each([1, 3])("ProductHeroGallery media with %i image(s)", (count) => {
  it("gives the first image the same source, srcset and sizes in the phone carousel and the desktop column", () => {
    const { container } = renderWithProviders(<ProductHeroGallery images={images(count)} title={TITLE} />)
    const [phoneFirst] = layoutImages(container, String.raw`.lg\:hidden`)
    const [desktopFirst] = layoutImages(container, String.raw`.lg\:block`)

    expect(resourceOf(phoneFirst)).toStrictEqual(resourceOf(desktopFirst))
    expect(phoneFirst).toHaveAttribute("sizes", "(width < 64rem) 100vw, 58vw")
  })

  it("asks for one image resource eagerly and at high priority, the first one", () => {
    const { container } = renderWithProviders(<ProductHeroGallery images={images(count)} title={TITLE} />)
    const priorityImages = [...container.querySelectorAll<HTMLImageElement>('img[fetchpriority="high"]')]

    expect(new Set(priorityImages.map((image) => resourceOf(image).join("\n"))).size).toBe(1)
    expect(priorityImages[0]?.getAttribute("src")).toContain("serenity-0.webp")
    expect(priorityImages.every((image) => image.getAttribute("loading") === "eager")).toBe(true)
  })

  it("lazy loads every other image at default priority and decodes every image asynchronously", () => {
    const { container } = renderWithProviders(<ProductHeroGallery images={images(count)} title={TITLE} />)
    const allImages = [...container.querySelectorAll("img")]
    const others = allImages.filter((image) => image.getAttribute("src")?.includes("serenity-0.webp") !== true)

    expect(others).toHaveLength(2 * (count - 1))
    expect(others.every((image) => image.getAttribute("loading") === "lazy" && !image.hasAttribute("fetchpriority"))).toBe(true)
    expect(allImages.every((image) => image.getAttribute("decoding") === "async")).toBe(true)
  })

  it("server-renders only the first phone slide's image, leaving the others to the running carousel", () => {
    const page = document.createElement("div")
    page.innerHTML = serverHtml(count)

    const phoneImages = layoutImages(page, String.raw`.lg\:hidden`)

    expect(phoneImages).toHaveLength(1)
    expect(phoneImages[0]?.getAttribute("src")).toContain("serenity-0.webp")
    expect(layoutImages(page, String.raw`.lg\:block`)).toHaveLength(count)
  })

  it("preloads a single image from the server-rendered html", () => {
    const html = serverHtml(count)
    const imagePreloads = html.match(/<link rel="preload" as="image"[^>]*>/gu) ?? []

    expect(imagePreloads).toHaveLength(1)
    expect(imagePreloads[0]).toContain("serenity-0.webp")
    expect(imagePreloads[0]).toContain('fetchPriority="high"')
  })
})
