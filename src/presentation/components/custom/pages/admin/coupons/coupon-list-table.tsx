import { type JSX, useCallback, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { MoreHorizontal, Pencil, Search, Trash2 } from "lucide-react"
import { useFormatter, useLocale, useTranslations } from "use-intl/react"

import { EMPTY_VALUE } from "~/src/modules/_core/constants/placeholder"
import { formatPrice } from "~/src/modules/_core/utils/currency"
import { DISCOUNT_STATUS_BADGE_STYLES, DISCOUNT_TYPE } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { getAdminDiscountsPageQuery } from "~/src/modules/discount/use-cases/get-admin-discounts-page"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "~/src/presentation/components/shadcn/table"

import { CatalogDeleteConfirmDialog } from "~/src/presentation/components/custom/pages/admin/catalog/dialog/components/catalog-delete-confirm-dialog"
import { CouponFormDialog } from "~/src/presentation/components/custom/pages/admin/coupons/coupon-form-dialog"
import { useCouponActions } from "~/src/presentation/components/custom/pages/admin/coupons/use-coupon-actions"

const HEADER_CLASS = "text-xs font-medium uppercase tracking-wider text-muted-foreground/60"

export const CouponListTable = (): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const [search, setSearch] = useState("")
  const { data } = useSuspenseQuery(getAdminDiscountsPageQuery({ search: search === "" ? undefined : search }))
  const actions = useCouponActions()

  return (
    <>
      <Card className="flex min-h-0 flex-1 flex-col border-border/40 shadow-none">
        <CardContent className="flex min-h-0 flex-1 flex-col p-0">
          <div className="flex shrink-0 items-center justify-between gap-4 border-b border-border/40 px-6 py-4">
            <div className="relative">
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground/40"
                strokeWidth={1.5}
              />
              <input
                aria-label={t("actions.search")}
                className="h-9 w-72 rounded-lg border border-border/50 bg-background pr-4 pl-10 text-sm text-foreground transition-colors placeholder:text-muted-foreground/40 focus:border-border focus:outline-none"
                onChange={(event) => {
                  setSearch(event.target.value)
                }}
                placeholder={t("actions.searchPlaceholder")}
                type="search"
                value={search}
              />
            </div>
            <Button className="h-9" onClick={actions.handleCreate} size="sm">
              {t("actions.createCoupon")}
            </Button>
          </div>

          {data.items.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 py-16 text-center">
              <p className="text-sm font-medium">{search === "" ? t("empty.title") : t("empty.noMatches")}</p>
              {search === "" && <p className="max-w-sm text-[13px] text-muted-foreground">{t("empty.description")}</p>}
            </div>
          ) : (
            <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className={`pl-6 ${HEADER_CLASS}`}>{t("columns.code")}</TableHead>
                    <TableHead className={HEADER_CLASS}>{t("columns.type")}</TableHead>
                    <TableHead className={HEADER_CLASS}>{t("columns.discount")}</TableHead>
                    <TableHead className={HEADER_CLASS}>{t("columns.minOrder")}</TableHead>
                    <TableHead className={HEADER_CLASS}>{t("columns.usage")}</TableHead>
                    <TableHead className={HEADER_CLASS}>{t("columns.expires")}</TableHead>
                    <TableHead className={HEADER_CLASS}>{t("columns.status")}</TableHead>
                    <TableHead className={`pr-6 text-right ${HEADER_CLASS}`}>{t("columns.actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((coupon) => (
                    <CouponRow coupon={coupon} key={coupon.id} onDelete={actions.handleRequestDelete} onEdit={actions.handleEdit} />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <CouponFormDialog
        coupon={actions.editing}
        isPending={actions.isPending}
        key={actions.editing?.id ?? "create"}
        onOpenChange={actions.setFormOpen}
        onSubmit={actions.handleSubmit}
        open={actions.formOpen}
      />

      <CatalogDeleteConfirmDialog
        cancelLabel={t("deleteDialog.cancel")}
        confirmLabel={t("deleteDialog.confirm")}
        description={t("deleteDialog.description", { code: actions.deleting?.code ?? EMPTY_VALUE })}
        isPending={actions.isPending}
        onConfirm={actions.handleConfirmDelete}
        onOpenChange={actions.setDeleteOpen}
        open={actions.deleteOpen}
        title={t("deleteDialog.title")}
      />
    </>
  )
}

const CouponRow = ({ coupon, onDelete, onEdit }: Readonly<CouponRowProps>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons")
  const format = useFormatter()
  const locale = useLocale()
  const style = DISCOUNT_STATUS_BADGE_STYLES[coupon.status]
  const handleEdit = useCallback(() => {
    onEdit(coupon)
  }, [coupon, onEdit])
  const handleDelete = useCallback(() => {
    onDelete(coupon)
  }, [coupon, onDelete])

  return (
    <TableRow>
      <TableCell className="pl-6">
        <p className="font-mono text-[13px] font-medium">{coupon.code}</p>
        {coupon.description !== undefined && <p className="text-[12px] text-muted-foreground">{coupon.description}</p>}
      </TableCell>
      <TableCell className="text-[13px] text-muted-foreground">{t(`type.${coupon.type}`)}</TableCell>
      <TableCell className="text-[13px] tabular-nums">{formatDiscountValue(coupon, locale)}</TableCell>
      <TableCell className="text-[13px] tabular-nums">
        {coupon.minOrderTotalMinorUnits === undefined ? EMPTY_VALUE : formatPrice(coupon.minOrderTotalMinorUnits, "PLN", locale)}
      </TableCell>
      <TableCell className="text-[13px] tabular-nums">
        {coupon.usageLimit === undefined
          ? t("usage.unlimited", { used: coupon.usageCount })
          : t("usage.limited", { limit: coupon.usageLimit, used: coupon.usageCount })}
      </TableCell>
      <TableCell className="text-[13px] text-muted-foreground">
        {coupon.endsAt === undefined ? EMPTY_VALUE : format.dateTime(coupon.endsAt, { day: "numeric", month: "short", year: "numeric" })}
      </TableCell>
      <TableCell>
        <Badge className={`text-[11px] ${style.className ?? ""}`} variant={style.variant}>
          {t(`status.${coupon.status}`)}
        </Badge>
      </TableCell>
      <TableCell className="pr-6 text-right">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button aria-label={t("columns.actions")} className="size-8" size="icon" variant="ghost">
                <MoreHorizontal className="size-4" strokeWidth={1.5} />
              </Button>
            }
          />
          <DropdownMenuContent align="end" className="min-w-44 p-1.5">
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px]" onClick={handleEdit}>
              <Pencil className="size-4" strokeWidth={1.5} />
              {t("actions.edit")}
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-3 px-3 py-2.5 text-[13px]" onClick={handleDelete} variant="destructive">
              <Trash2 className="size-4" strokeWidth={1.5} />
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  )
}

const formatDiscountValue = (coupon: Discount["adminListItem"], locale: string): string => {
  if (coupon.type === DISCOUNT_TYPE.FREE_SHIPPING) {
    return EMPTY_VALUE
  }

  if (coupon.type === DISCOUNT_TYPE.PERCENTAGE) {
    return `${String(coupon.value)}%`
  }

  return formatPrice(coupon.value, "PLN", locale)
}

interface CouponRowProps {
  readonly coupon: Discount["adminListItem"]
  readonly onDelete: (coupon: Discount["adminListItem"]) => void
  readonly onEdit: (coupon: Discount["adminListItem"]) => void
}
