import { cleanup, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithProviders } from "~/src/platform/testing/lib/render"

vi.mock("~/src/lib/url", () => ({
  getAssetURL: (path: string) => `https://assets.test/${path.replace(/^\//u, "")}`,
  isAssetCdnUrl: () => false,
  resolveAssetURL: (pathOrUrl: string) => pathOrUrl,
}))
vi.mock("~/src/presentation/components/custom/pages/product-page/product-breadcrumb", () => ({
  ProductBreadcrumb: ({ productTitle }: { readonly productTitle: string }) => <nav>{`breadcrumb: ${productTitle}`}</nav>,
}))
vi.mock("~/src/presentation/components/custom/pages/product-page/product-hero-gallery", () => ({
  ProductHeroGallery: ({ images, title }: { readonly images: readonly string[]; readonly title: string }) => (
    <div data-testid="gallery" data-title={title}>
      {images.join("|")}
    </div>
  ),
}))
vi.mock("~/src/presentation/components/custom/pages/product-page/product-hero-info", () => ({
  ProductHeroInfo: ({ product }: { readonly product: { readonly title: string } }) => <div data-testid="info">{product.title}</div>,
}))

import { PLACEHOLDER_IMAGE } from "~/src/lib/image"

import { ProductHeroSection } from "~/src/presentation/components/custom/pages/product-page/sections/product-hero-section"

import { storefrontProduct, storefrontVariant } from "./storefront-product-fixture"

const galleryImages = (): string => screen.getByTestId("gallery").textContent

afterEach(cleanup)

describe("ProductHeroSection gallery source", () => {
  it("shows shared images while no sellable variant is selected", () => {
    renderWithProviders(<ProductHeroSection product={storefrontProduct({ sharedImageUrls: ["shared.webp"], variants: [] })} />)

    expect(galleryImages()).toBe("shared.webp")
    expect(screen.getByTestId("info")).toHaveTextContent("Silver ring")
  })

  it("shows the images of the selected variant", () => {
    renderWithProviders(
      <ProductHeroSection
        product={storefrontProduct({
          imageUrls: ["product-a.webp"],
          sharedImageUrls: ["shared-a.webp"],
          variants: [storefrontVariant({ imageUrls: ["variant-a.webp", "variant-b.webp"] })],
        })}
      />,
    )

    expect(galleryImages()).toBe("variant-a.webp|variant-b.webp")
  })

  it("falls back to the images shared across variants", () => {
    renderWithProviders(
      <ProductHeroSection
        product={storefrontProduct({
          imageUrls: ["product-a.webp"],
          sharedImageUrls: ["shared-a.webp", "shared-b.webp"],
        })}
      />,
    )

    expect(galleryImages()).toBe("shared-a.webp|shared-b.webp")
  })

  it("falls back to the product images when nothing is shared or variant specific", () => {
    renderWithProviders(<ProductHeroSection product={storefrontProduct({ imageUrls: ["product-a.webp", "product-b.webp"] })} />)

    expect(galleryImages()).toBe("product-a.webp|product-b.webp")
  })

  it("falls back to the thumbnail when the product has no image list at all", () => {
    renderWithProviders(<ProductHeroSection product={storefrontProduct({ thumbnail: "thumb.webp" })} />)

    expect(galleryImages()).toBe("thumb.webp")
  })

  it("falls back to the placeholder when there is not even a thumbnail", () => {
    renderWithProviders(<ProductHeroSection product={storefrontProduct()} />)

    expect(galleryImages()).toBe(PLACEHOLDER_IMAGE)
  })
})

describe("ProductHeroSection layout", () => {
  it("puts the breadcrumb above the hero", () => {
    renderWithProviders(<ProductHeroSection product={storefrontProduct()} />)

    expect(screen.getByText("breadcrumb: Silver ring")).toBeInTheDocument()
  })

  it("names the gallery after the product", () => {
    renderWithProviders(<ProductHeroSection product={storefrontProduct()} />)

    expect(screen.getByTestId("gallery")).toHaveAttribute("data-title", "Silver ring")
  })

  it("renders the buying information beside the gallery", () => {
    renderWithProviders(<ProductHeroSection product={storefrontProduct()} />)

    expect(screen.getByTestId("info")).toHaveTextContent("Silver ring")
  })
})
