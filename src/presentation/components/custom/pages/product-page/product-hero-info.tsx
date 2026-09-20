import { type JSX, useEffect, useRef, useState } from "react"

import { useFormatter, useLocale, useTranslations } from "use-intl"

import { resolveCollectionTitle } from "~/src/modules/product-collection/product-collection.utils"
import { type StorefrontProduct, type StorefrontProductVariant } from "~/src/modules/product/product.types"

import { centsToDisplayAmount } from "~/src/lib/currency"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"

import { resolveProductHeroDetailLine } from "~/src/presentation/components/custom/pages/product-page/product-hero-detail-line"
import { ProductHeroDetails } from "~/src/presentation/components/custom/pages/product-page/product-hero-details"
import { ProductMobileBuyBar } from "~/src/presentation/components/custom/pages/product-page/product-mobile-buy-bar"
import { ProductVariantPicker } from "~/src/presentation/components/custom/pages/product-page/product-variant-picker"
import { QuantityPicker } from "~/src/presentation/components/custom/pages/product-page/quantity-picker"
import { useProductHeroCart } from "~/src/presentation/components/custom/pages/product-page/use-product-hero-cart"
export const ProductHeroInfo = ({ onSelectOptionValue, product, selectedValueIds, selectedVariant }: ProductHeroInfoProps): JSX.Element => {
  const t = useTranslations("pages.product.heroSection")
  const tProduct = useTranslations("pages.product")
  const format = useFormatter()
  const locale = useLocale()
  const variantPrice = selectedVariant?.price
  const heroImage = selectedVariant?.imageUrls[0] ?? product.sharedImageUrls[0] ?? product.thumbnail
  const price =
    variantPrice === undefined
      ? "—"
      : format.number(centsToDisplayAmount(variantPrice), {
          currency: "PLN",
          style: "currency",
        })
  const { availableQuantity, canPurchase, handleAddToCart, isAdded, isOutOfStock, quantity, setQuantity } = useProductHeroCart({
    heroImage,
    price,
    product,
    selectedVariant,
    variantPrice,
  })
  const specifications = selectedVariant?.specifications ?? product.sharedSpecifications
  const selectedSku = selectedVariant?.sku?.trim() ?? EMPTY_SKU
  const productDetailLine = resolveProductHeroDetailLine(product.subtitle, specifications, locale)
  const purchaseRowRef = useRef<HTMLDivElement>(null)
  const [showMobileBuyBar, setShowMobileBuyBar] = useState(false)
  useEffect(() => {
    const purchaseRow = purchaseRowRef.current
    if (purchaseRow === null) {
      return
    }
    const mobileQuery = globalThis.matchMedia("(max-width: 1023px)")
    const updateVisibility = (entries: readonly IntersectionObserverEntry[]): void => {
      if (!mobileQuery.matches) {
        setShowMobileBuyBar(false)
        return
      }
      const [entry] = entries
      if (entry === undefined) {
        return
      }
      setShowMobileBuyBar(!entry.isIntersecting)
    }
    const observer = new IntersectionObserver(updateVisibility, {
      rootMargin: "0px 0px -12px 0px",
      threshold: 0,
    })
    const handleViewportChange = (): void => {
      if (!mobileQuery.matches) {
        setShowMobileBuyBar(false)
      }
    }
    observer.observe(purchaseRow)
    mobileQuery.addEventListener("change", handleViewportChange)
    return function disconnectPurchaseRowObserver() {
      observer.disconnect()
      mobileQuery.removeEventListener("change", handleViewportChange)
    }
  }, [isOutOfStock])
  return (
    <aside className="reveal space-y-6 lg:sticky lg:top-24 lg:self-start">
      <header className="space-y-3">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">
          {product.collection === undefined
            ? t("collection")
            : resolveCollectionTitle(product.collection.titles, locale) || t("collection")}
        </p>
        <h1 className="font-serif text-4xl leading-tight md:text-5xl">{product.title}</h1>
        {selectedSku !== EMPTY_SKU && (
          <p className="text-[10px] tracking-wider text-muted-foreground/60">
            {t("sku", {
              sku: selectedSku,
            })}
          </p>
        )}
      </header>

      <Separator className="bg-border" />

      <p className="text-lg tracking-[0.06em]">{price}</p>

      <ProductVariantPicker onSelectOptionValue={onSelectOptionValue} product={product} selectedValueIds={selectedValueIds} />

      {productDetailLine !== undefined && <p className="text-xs tracking-wide text-muted-foreground">{productDetailLine}</p>}

      <Separator className="bg-border" />

      {isOutOfStock ? (
        <p className="text-sm tracking-wide text-destructive">{tProduct("outOfStock")}</p>
      ) : (
        <div ref={purchaseRowRef} className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <QuantityPicker maxQuantity={availableQuantity} quantity={quantity} setQuantity={setQuantity} />

          <Button
            className="h-14 flex-1 bg-foreground px-8 text-[12px] tracking-[0.24em] text-background uppercase hover:bg-foreground/90"
            disabled={!canPurchase}
            onClick={handleAddToCart}
            type="button"
          >
            {isAdded
              ? t("addedToCart", {
                  fallback: "Dodano",
                })
              : t("addToCart")}
          </Button>
        </div>
      )}

      <Separator className="bg-border" />

      <ProductHeroDetails description={product.description} specifications={specifications} />

      {showMobileBuyBar && !isOutOfStock && (
        <ProductMobileBuyBar canPurchase={canPurchase} isAdded={isAdded} onAddToCart={handleAddToCart} price={price} />
      )}
    </aside>
  )
}
const EMPTY_SKU = ""
export interface ProductHeroInfoProps {
  readonly onSelectOptionValue: (optionId: string, valueId: string) => void
  readonly product: StorefrontProduct
  readonly selectedValueIds: Readonly<Record<string, string>>
  readonly selectedVariant: StorefrontProductVariant | undefined
}
