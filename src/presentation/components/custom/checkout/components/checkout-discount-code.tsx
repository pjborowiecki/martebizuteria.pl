import { type JSX, useCallback } from "react"

import { type UseQueryResult } from "@tanstack/react-query"
import { cn } from "cn"
import { Loader2, Tag, X } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { type Discount } from "~/src/modules/discount/discount.types"

import { Button } from "~/src/presentation/components/shadcn/button"

export const CheckoutDiscountCode = ({ check, code, onRemove }: Readonly<CheckoutDiscountCodeProps>): JSX.Element => {
  const t = useTranslations("pages.checkout.discount")
  const format = useFormatter()
  const { refetch } = check
  const applied = check.isSuccess ? check.data.applied : undefined
  const rejection = check.isSuccess ? check.data.rejection : undefined

  const handleRetry = useCallback(() => {
    void refetch()
  }, [refetch])

  return (
    <div className="space-y-2">
      <div
        className={cn(
          "flex items-center gap-2 border border-border/60 px-3 py-2.5",
          applied !== undefined && "border-emerald-600/30 bg-emerald-500/5",
          (rejection !== undefined || check.isError) && "border-destructive/30 bg-destructive/5",
        )}
      >
        <Tag className={cn("size-3.5 shrink-0", applied !== undefined && "text-emerald-600")} strokeWidth={1.5} />
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-[11px] font-medium tracking-[0.12em] uppercase",
            rejection !== undefined && "line-through",
          )}
        >
          {code}
        </span>
        {applied !== undefined && (
          <span className="text-[12px] tabular-nums">
            −{format.number(centsToDisplayAmount(applied.amountMinorUnits), { currency: "PLN", style: "currency" })}
          </span>
        )}
        {check.isPending && (
          <Loader2 aria-label={t("checking")} className="size-3.5 shrink-0 animate-spin text-muted-foreground" role="status" />
        )}
        <Button
          aria-label={t("remove")}
          className="size-6 shrink-0 text-muted-foreground"
          onClick={onRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="size-3.5" strokeWidth={1.5} />
        </Button>
      </div>
      {rejection !== undefined && <p className="text-[11px] text-destructive">{t(`rejection.${rejection}`)}</p>}
      {check.isError && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-[11px] text-destructive">{t("checkFailed")}</p>
          <Button className="h-auto shrink-0 p-0 text-[11px]" onClick={handleRetry} type="button" variant="link">
            {t("retry")}
          </Button>
        </div>
      )}
    </div>
  )
}

interface CheckoutDiscountCodeProps {
  readonly check: UseQueryResult<Discount["validation"]>
  readonly code: string
  readonly onRemove: () => void
}
