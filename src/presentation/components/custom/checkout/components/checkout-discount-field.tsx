import { type JSX, type SubmitEventHandler, useCallback, useState } from "react"

import { useMutation } from "@tanstack/react-query"
import { Loader2, Tag, X } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { centsToDisplayAmount } from "~/src/modules/_core/utils/currency"
import { DISCOUNT_CODE_MAX_LENGTH, type DiscountRejection } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { normalizeDiscountCode } from "~/src/modules/discount/discount.utils"
import { validateDiscountCodeMutation } from "~/src/modules/discount/use-cases/validate-discount-code"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Input } from "~/src/presentation/components/shadcn/input"

export const CheckoutDiscountField = ({
  applied,
  email,
  itemsSubtotal,
  onApplied,
  onCleared,
  shippingTotal,
}: Readonly<CheckoutDiscountFieldProps>): JSX.Element => {
  const t = useTranslations("pages.checkout.discount")
  const format = useFormatter()
  const [code, setCode] = useState("")
  const [rejection, setRejection] = useState<DiscountRejection | undefined>(undefined)
  const validate = useMutation(validateDiscountCodeMutation)

  const handleSubmit = useCallback<SubmitEventHandler<HTMLFormElement>>(
    (event) => {
      event.preventDefault()
      const candidate = normalizeDiscountCode(code)
      if (candidate === "") {
        return
      }

      setRejection(undefined)
      validate.mutate(
        { code: candidate, email, itemsSubtotal, shippingTotal },
        {
          onSuccess: (result) => {
            if (result.applied === undefined) {
              setRejection(result.rejection)

              return
            }
            setCode("")
            onApplied(result.applied)
          },
        },
      )
    },
    [code, email, itemsSubtotal, onApplied, shippingTotal, validate],
  )

  const handleRemove = useCallback(() => {
    setRejection(undefined)
    onCleared()
  }, [onCleared])

  if (applied !== undefined) {
    return (
      <div className="flex items-center gap-2 border border-emerald-600/30 bg-emerald-500/5 px-3 py-2.5">
        <Tag className="size-3.5 shrink-0 text-emerald-600" strokeWidth={1.5} />
        <span className="min-w-0 flex-1 truncate text-[11px] font-medium tracking-[0.12em] uppercase">{applied.code}</span>
        <span className="text-[12px] tabular-nums">
          −
          {format.number(centsToDisplayAmount(applied.amountMinorUnits), {
            currency: "PLN",
            style: "currency",
          })}
        </span>
        <Button
          aria-label={t("remove")}
          className="size-6 shrink-0 text-muted-foreground"
          onClick={handleRemove}
          size="icon"
          type="button"
          variant="ghost"
        >
          <X className="size-3.5" strokeWidth={1.5} />
        </Button>
      </div>
    )
  }

  return (
    <form className="space-y-2" onSubmit={handleSubmit}>
      <label className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground uppercase" htmlFor="discount-code">
        {t("label")}
      </label>
      <div className="flex gap-2">
        <Input
          autoComplete="off"
          className="h-10 rounded-none text-[12px] tracking-[0.1em] uppercase"
          id="discount-code"
          maxLength={DISCOUNT_CODE_MAX_LENGTH}
          onChange={(event) => {
            setCode(event.target.value)
            setRejection(undefined)
          }}
          placeholder={t("placeholder")}
          value={code}
        />
        <Button
          className="h-10 shrink-0 rounded-none px-5 text-[11px] tracking-[0.15em] uppercase"
          disabled={validate.isPending}
          type="submit"
        >
          {validate.isPending ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : t("apply")}
        </Button>
      </div>
      {rejection !== undefined && <p className="text-[11px] text-destructive">{t(`rejection.${rejection}`)}</p>}
      {validate.isError && <p className="text-[11px] text-destructive">{t("rejection.error")}</p>}
    </form>
  )
}

interface CheckoutDiscountFieldProps {
  readonly applied: Discount["applied"] | undefined
  readonly email: string | undefined
  readonly itemsSubtotal: number
  readonly onApplied: (applied: Discount["applied"]) => void
  readonly onCleared: () => void
  readonly shippingTotal: number
}
