import { type JSX, useCallback } from "react"

import { Minus, Plus } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"

export const QuantityPicker = ({ maxQuantity, quantity, setQuantity }: QuantityPickerProps): JSX.Element => {
  const t = useTranslations("pages.product.heroSection")
  const handleDecrease = useCallback(() => {
    setQuantity((currentQuantity) => Math.max(MIN_QUANTITY, currentQuantity - MIN_QUANTITY))
  }, [setQuantity])

  const handleIncrease = useCallback(() => {
    setQuantity((currentQuantity) => {
      const next = currentQuantity + MIN_QUANTITY
      if (maxQuantity === undefined) {
        return next
      }

      return Math.min(next, maxQuantity)
    })
  }, [maxQuantity, setQuantity])

  return (
    <div className="flex items-center gap-4">
      <span className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("quantity")}</span>
      <div className="flex h-14 items-center border border-border">
        <Button
          aria-label={t("decreaseQuantity")}
          className="size-14 rounded-none hover:bg-secondary"
          onClick={handleDecrease}
          type="button"
          variant="ghost"
        >
          <Minus className="size-4" />
        </Button>
        <span className="flex h-14 w-12 items-center justify-center border-x border-border text-sm font-medium">{quantity}</span>
        <Button
          aria-label={t("increaseQuantity")}
          className="size-14 rounded-none hover:bg-secondary"
          disabled={maxQuantity !== undefined && quantity >= maxQuantity}
          onClick={handleIncrease}
          type="button"
          variant="ghost"
        >
          <Plus className="size-4" />
        </Button>
      </div>
    </div>
  )
}

const MIN_QUANTITY = 1

interface QuantityPickerProps {
  readonly maxQuantity?: number
  readonly quantity: number
  readonly setQuantity: (quantity: number | ((prev: number) => number)) => void
}
