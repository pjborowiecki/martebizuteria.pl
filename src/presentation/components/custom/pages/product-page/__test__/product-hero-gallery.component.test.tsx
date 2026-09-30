import { cleanup, screen } from "@testing-library/react"
import { userEvent } from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

import { ProductHeroGallery } from "~/src/presentation/components/custom/pages/product-page/product-hero-gallery"

vi.mock("~/src/presentation/components/custom/image", () => ({
  Image: ({ alt, src }: { readonly alt: string; readonly src: string }) => <img alt={alt} src={src} />,
}))

class ObserverStub {
  disconnect(): void {
    return undefined
  }

  observe(): void {
    return undefined
  }

  takeRecords(): [] {
    return []
  }

  unobserve(): void {
    return undefined
  }
}

const matchMediaStub = (query: string) => ({
  addEventListener: () => {},
  addListener: () => {},
  dispatchEvent: () => false,
  matches: false,
  media: query,
  onchange: null,
  removeEventListener: () => {},
  removeListener: () => {},
})

const TITLE = "Silver ring"

const images = (count: number) => Array.from({ length: count }, (_, index) => `products/ring-${index}.webp`)

describe("ProductHeroGallery", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ObserverStub)
    vi.stubGlobal("matchMedia", matchMediaStub)
    vi.stubGlobal("IntersectionObserver", ObserverStub)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })

  it("shows a single image on both the mobile and the desktop layout", () => {
    renderWithProviders(<ProductHeroGallery images={images(1)} title={TITLE} />)

    expect(screen.getAllByRole("img", { name: TITLE })).toHaveLength(2)
  })

  it("offers no carousel controls for a single image", () => {
    renderWithProviders(<ProductHeroGallery images={images(1)} title={TITLE} />)

    expect(screen.queryAllByRole("button")).toStrictEqual([])
  })

  it("renders every image once per layout", () => {
    renderWithProviders(<ProductHeroGallery images={images(3)} title={TITLE} />)

    expect(screen.getAllByRole("img", { name: TITLE })).toHaveLength(6)
  })

  it("keeps the sources the product supplied", () => {
    renderWithProviders(<ProductHeroGallery images={["products/only.webp"]} title={TITLE} />)

    expect(screen.getAllByRole("img", { name: TITLE })[0]).toHaveAttribute("src", "products/only.webp")
  })

  it("offers one carousel dot per image once there is more than one", () => {
    renderWithProviders(<ProductHeroGallery images={images(3)} title={TITLE} />)

    expect(screen.getByRole("button", { name: "Image 1" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Image 2" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Image 3" })).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Image 4" })).toBeNull()
  })

  it("marks the first image as the current one", () => {
    renderWithProviders(<ProductHeroGallery images={images(2)} title={TITLE} />)

    expect(screen.getByRole("button", { name: "Image 1" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: "Image 2" })).not.toHaveAttribute("aria-current")
  })

  it("renders nothing to look at when the product has no images", () => {
    renderWithProviders(<ProductHeroGallery images={[]} title={TITLE} />)

    expect(screen.queryAllByRole("img")).toStrictEqual([])
  })

  it("moves to the next image from the right hand control", async () => {
    renderWithProviders(<ProductHeroGallery images={images(3)} title={TITLE} />)

    await userEvent.click(carouselControl(1))

    expect(screen.getByRole("button", { name: "Image 2" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: "Image 1" })).not.toHaveAttribute("aria-current")
  })

  it("loops back to the last image from the left hand control", async () => {
    renderWithProviders(<ProductHeroGallery images={images(3)} title={TITLE} />)

    await userEvent.click(carouselControl(0))

    expect(screen.getByRole("button", { name: "Image 3" })).toHaveAttribute("aria-current", "true")
  })

  it("jumps straight to the image behind a dot", async () => {
    renderWithProviders(<ProductHeroGallery images={images(3)} title={TITLE} />)

    await userEvent.click(screen.getByRole("button", { name: "Image 3" }))

    expect(screen.getByRole("button", { name: "Image 3" })).toHaveAttribute("aria-current", "true")
    expect(screen.getByRole("button", { name: "Image 1" })).not.toHaveAttribute("aria-current")
  })
})

const carouselControl = (index: number): HTMLElement => {
  const control = screen.getAllByRole("button")[index]
  if (control === undefined) {
    throw new Error(`expected a carousel control at index ${index}`)
  }

  return control
}
