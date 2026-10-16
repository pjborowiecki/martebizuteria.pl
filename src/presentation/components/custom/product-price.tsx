import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { type PriceReduction } from "~/src/modules/price-history/price-history.types"

import { useFormatter } from "~/src/hooks/use-display-format"

export const ProductPrice = ({ className, price, priceReduction }: ProductPriceProps): JSX.Element => {
  const t = useTranslations("components.custom.productPrice")
  const format = useFormatter()
  if (priceReduction === undefined) {
    return <p className={className}>{price}</p>
  }

  const lowestPrice = format.number(centsToDisplayAmount(priceReduction.lowestPrice), { currency: "PLN", style: "currency" })

  return (
    <div className="space-y-1">
      <p className={className}>
        {price}
        <s aria-hidden className="ml-2 text-muted-foreground">
          {lowestPrice}
        </s>
      </p>
      <p className="text-xs leading-relaxed tracking-normal text-muted-foreground normal-case">
        {t("lowestPriceBeforeReduction", { price: lowestPrice })}
      </p>
    </div>
  )
}

interface ProductPriceProps {
  readonly className: string
  readonly price: string
  readonly priceReduction: PriceReduction | undefined
}
