import { type JSX, type SyntheticEvent, useCallback } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { DISCOUNT_CODE_MAX_LENGTH } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { normalizeDiscountCode } from "~/src/modules/discount/discount.utils"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"
import { validateDiscountCodeMutation } from "~/src/modules/discount/use-cases/validate-discount-code"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Input } from "~/src/presentation/components/shadcn/input"

export const CheckoutDiscountField = ({
  email,
  itemsSubtotal,
  onApplied,
  shippingTotal,
}: Readonly<CheckoutDiscountFieldProps>): JSX.Element => {
  const t = useTranslations("pages.checkout.discount")
  const form = useForm<Discount["checkoutCodeFormValues"]>({
    defaultValues: { code: "" },
    resolver: zodResolver(discountZodSchemas.checkoutCodeFormValues),
  })
  const validate = useMutation(validateDiscountCodeMutation)
  const rejection = validate.data?.rejection

  const applyCode = useCallback(
    ({ code }: Discount["checkoutCodeFormValues"]) => {
      validate.mutate(
        { code: normalizeDiscountCode(code), email, itemsSubtotal, shippingTotal },
        {
          onSuccess: (result) => {
            if (result.applied !== undefined) {
              onApplied(result.applied.code)
            }
          },
        },
      )
    },
    [email, itemsSubtotal, onApplied, shippingTotal, validate],
  )

  const handleSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      void form.handleSubmit(applyCode)(event)
    },
    [applyCode, form],
  )

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
          placeholder={t("placeholder")}
          {...form.register("code", { onChange: validate.reset })}
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
  readonly email: string | undefined
  readonly itemsSubtotal: number
  readonly onApplied: (code: string) => void
  readonly shippingTotal: number
}
