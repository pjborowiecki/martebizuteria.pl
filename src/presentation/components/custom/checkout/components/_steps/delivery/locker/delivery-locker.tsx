import { type JSX } from "react"

import { Package } from "lucide-react"
import { useController } from "react-hook-form"
import { useTranslations } from "use-intl"

import { Field, FieldError } from "~/src/presentation/components/shadcn/field"

import { InpostSelector } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/inpost/inpost-selector"
import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
export const DeliveryLocker = (): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const { control } = useCheckoutForm()
  const { field, fieldState } = useController({
    control,
    name: "lockerId",
  })
  return (
    <div className="flex flex-col gap-5 rounded-none border border-border/50 bg-background p-6">
      <div className="space-y-1">
        <p className="text-[13px] font-medium tracking-[0.15em] text-foreground uppercase">{t("deliverySubsteps.lockerTitle")}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">{t("deliverySubsteps.lockerText")}</p>
      </div>

      <Field data-invalid={fieldState.invalid} className="flex flex-col gap-3">
        {field.value !== "" && (
          <div className="flex items-center gap-4 rounded-none border border-foreground/10 bg-muted/20 p-4">
            <Package className="size-8 text-foreground/70" strokeWidth={1} />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">{t("selectedLocker")}</span>
              <span className="text-base font-medium text-foreground">{field.value}</span>
            </div>
          </div>
        )}

        <InpostSelector />
        {fieldState.invalid && fieldState.error?.message !== undefined && <FieldError>{t(fieldState.error.message)}</FieldError>}
      </Field>
    </div>
  )
}
