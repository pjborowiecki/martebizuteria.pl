import { type JSX } from "react"

import { Package } from "lucide-react"
import { useLocale } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import { type Order } from "~/src/modules/order/order.types"

import { TableCell, TableRow } from "~/src/presentation/components/shadcn/table"

import { Image } from "~/src/presentation/components/custom/image"

export const OrderLineItemRow = ({ currencyCode, item }: Readonly<OrderLineItemRowProps>): JSX.Element => {
  const locale = useLocale()

  return (
    <TableRow className="group">
      <TableCell className="pl-5">
        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-secondary">
            {item.imageUrl === undefined ? (
              <Package className="size-4 text-muted-foreground/40" strokeWidth={1.5} />
            ) : (
              <Image alt={item.title} className="size-10 object-cover" height={40} src={item.imageUrl} width={40} />
            )}
          </div>
          <div>
            <p className="text-sm font-medium">{item.title}</p>
            {item.variantTitle !== undefined && <p className="text-[12px] text-muted-foreground">{item.variantTitle}</p>}
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-xs text-muted-foreground">{item.sku ?? EMPTY_VALUE}</TableCell>
      <TableCell className="text-center font-mono text-sm">{item.quantity}</TableCell>
      <TableCell className="text-right font-mono text-sm">{formatPrice(item.unitPriceMinorUnits, currencyCode, locale)}</TableCell>
      <TableCell className="pr-5 text-right font-mono text-sm font-medium">
        {formatPrice(item.totalMinorUnits, currencyCode, locale)}
      </TableCell>
    </TableRow>
  )
}

interface OrderLineItemRowProps {
  readonly currencyCode: string
  readonly item: Order["adminOrderDetailItem"]
}
