import { type JSX, type MouseEvent, useCallback } from "react"

import { useRouter } from "@tanstack/react-router"
import { cn } from "cn"
import { useTranslations } from "use-intl"

import { PRODUCT_LOW_STOCK_THRESHOLD } from "~/src/modules/product/product.constants"

import { type ProductRecord, STATUS_MAP } from "~/src/data/catalog-data"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { TableCell, TableRow } from "~/src/presentation/components/shadcn/table"

import { Image } from "~/src/presentation/components/custom/image"
import { CatalogRowActions } from "~/src/presentation/components/custom/pages/admin/catalog/catalog-table/catalog-row-actions"

import { ROUTES } from "~/src/routes"
const getStockColorClass = (stock: number): string => {
  if (stock === OUT_OF_STOCK) {
    return "text-red-500"
  }
  if (stock <= PRODUCT_LOW_STOCK_THRESHOLD) {
    return "text-amber-600"
  }
  return "text-foreground"
}
export const CatalogRow = ({ product }: CatalogRowProps): JSX.Element => {
  const t = useTranslations("pages.admin.catalog")
  const tAdmin = useTranslations("pages.admin")
  const router = useRouter()
  const statusInfo = STATUS_MAP[product.status] ?? {
    variant: "secondary",
  }
  const handleRowClick = useCallback(() => {
    const prefix = "/{-$locale}" as const
    void router.navigate({
      params: {
        handle: product.id,
      },
      to: `${prefix}${ROUTES.ADMIN_PRODUCTS}/$handle`,
    })
  }, [router, product.id])
  const handleCheckboxClick = useCallback((event: MouseEvent<HTMLTableCellElement>) => {
    event.stopPropagation()
  }, [])
  const handleActionsClick = useCallback((event: MouseEvent<HTMLTableCellElement>) => {
    event.stopPropagation()
  }, [])
  return (
    <TableRow className="group cursor-pointer" onClick={handleRowClick}>
      <TableCell className="pl-6" onClick={handleCheckboxClick}>
        <input type="checkbox" aria-label={tAdmin("a11y.selectRow")} className="size-4 rounded border-border accent-foreground" />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative size-10 shrink-0 overflow-hidden rounded-lg bg-secondary">
            <Image src={product.image} alt={product.name} height={40} width={40} sizes="40px" className="h-full w-full object-cover" />
          </div>
          <span className="text-sm font-medium">{product.name}</span>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm text-muted-foreground">{product.id}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{product.category}</TableCell>
      <TableCell className="text-sm text-muted-foreground">{product.collection}</TableCell>
      <TableCell className="text-right font-mono text-sm font-medium">{product.price}</TableCell>
      <TableCell className="text-right">
        <span className={cn("font-mono text-sm", getStockColorClass(product.stock))}>{product.stock}</span>
      </TableCell>
      <TableCell>
        <Badge variant={statusInfo.variant} className="text-[11px]">
          {t(`status.${product.status}`)}
        </Badge>
      </TableCell>
      <TableCell className="pr-6" onClick={handleActionsClick}>
        <CatalogRowActions productId={product.id} />
      </TableCell>
    </TableRow>
  )
}
const OUT_OF_STOCK = 0
interface CatalogRowProps {
  readonly product: ProductRecord
}
