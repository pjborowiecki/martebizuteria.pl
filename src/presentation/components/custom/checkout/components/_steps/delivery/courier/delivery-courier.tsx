import { type JSX } from "react"

import { useQuery } from "@tanstack/react-query"
import { Truck } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { DELIVERY_METHOD } from "~/src/modules/delivery-method/delivery-method.constants"
import { listDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-delivery-methods"

import { CheckoutRadioField, CheckoutTextField, OptionCard } from "~/src/presentation/components/custom/checkout/components/checkout-fields"
import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"

export const DeliveryCourier = (): JSX.Element | undefined => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const format = useFormatter()
  const { control } = useCheckoutForm()
  const { data: deliveryMethods = [] } = useQuery(listDeliveryMethodsQuery())
  const couriers = deliveryMethods.filter((m) => m.type === DELIVERY_METHOD.COURIER)
  if (couriers.length === 0) {
    return undefined
  }

  return (
    <div className="flex flex-col gap-5 rounded-none border border-border/50 bg-background p-5">
      <p className="text-[10px] font-medium tracking-[0.22em] text-muted-foreground uppercase">{t("deliverySubsteps.courierTitle")}</p>

      <CheckoutRadioField control={control} name="deliveryMethod">
        {couriers.map((method) => (
          <OptionCard
            key={method.id}
            value={method.id}
            id={`checkout-delivery-courier-${method.id}`}
            label={method.name}
            description={format.number(method.price / CENTS_IN_ZLOTY, {
              currency: "PLN",
              style: "currency",
            })}
            icon={courierIcon}
          />
        ))}
      </CheckoutRadioField>

      <p className="text-sm leading-relaxed text-muted-foreground">{t("deliverySubsteps.courierText")}</p>

      <CheckoutTextField control={control} name="deliveryNotes" label={t("deliveryNotes")} placeholder={t("deliveryNotesPlaceholder")} />
    </div>
  )
}

const CENTS_IN_ZLOTY = 100

const courierIcon = <Truck className="size-6" strokeWidth={1.25} />
