import { type JSX } from "react"

import { useTranslations } from "use-intl"

import { Button } from "~/src/presentation/components/shadcn/button"
export const ProductMobileBuyBar = ({ canPurchase, isAdded, onAddToCart, price }: Readonly<ProductMobileBuyBarProps>): JSX.Element => {
  const t = useTranslations("pages.product.heroSection")
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/95 px-6 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md lg:hidden">
      <div className="mx-auto flex max-w-400 items-center gap-4">
        <p className="min-w-0 shrink-0 text-sm tracking-[0.06em] tabular-nums">{price}</p>
        <Button
          className="h-12 flex-1 bg-foreground text-[11px] tracking-[0.22em] text-background uppercase hover:bg-foreground/90"
          disabled={!canPurchase}
          onClick={onAddToCart}
          type="button"
        >
          {isAdded ? t("addedToCart") : t("addToCart")}
        </Button>
      </div>
    </div>
  )
}
interface ProductMobileBuyBarProps {
  readonly canPurchase: boolean
  readonly isAdded: boolean
  readonly onAddToCart: () => void
  readonly price: string
}
