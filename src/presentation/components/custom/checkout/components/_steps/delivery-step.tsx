import { type JSX, type MouseEvent, useCallback } from "react"

import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Package, Store, Truck } from "lucide-react"
import { useWatch } from "react-hook-form"
import { useFormatter, useTranslations } from "use-intl"

import { DELIVERY_METHOD, DELIVERY_METHODS, type DeliveryMethodType } from "~/src/modules/delivery-method/delivery-method.constants"
import { deliveryMethodsQueryOptions } from "~/src/modules/delivery-method/use-cases/list-delivery-methods"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { DeliveryCourier } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/courier/delivery-courier"
import { DeliveryLocker } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/locker/delivery-locker"
import { DeliveryInStore } from "~/src/presentation/components/custom/checkout/components/_steps/delivery/store/delivery-in-store"
import { CheckoutRadioField, OptionCard } from "~/src/presentation/components/custom/checkout/components/checkout-fields"
import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import { CHECKOUT_STEP_ID } from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

type Formatter = ReturnType<typeof useFormatter>
type Translator = ReturnType<typeof useTranslations>

const CENTS_IN_ZLOTY = 100

const DELIVERY_ICONS: Record<DeliveryMethodType, JSX.Element> = {
  courier: <Truck className="size-6" strokeWidth={1.25} />,
  in_store: <Store className="size-6" strokeWidth={1.25} />,
  locker: <Package className="size-6" strokeWidth={1.25} />,
}

interface HelperMethod {
  readonly id: string
  readonly type: string
  readonly price: number
}

const getDeliveryDescription = ({
  format,
  methods,
  t,
  type,
}: Readonly<{
  format: Formatter
  methods: readonly HelperMethod[]
  t: Translator
  type: DeliveryMethodType
}>): string | undefined => {
  if (methods.length === 0) {
    return undefined
  }

  if (type === DELIVERY_METHOD.COURIER && methods.length > 1) {
    const lowestPrice = Math.min(...methods.map((m) => m.price))
    return `${t("deliverySubsteps.from")} ${format.number(lowestPrice / CENTS_IN_ZLOTY, { currency: "PLN", style: "currency" })}`
  }

  const [firstMethod] = methods
  if (firstMethod === undefined) {
    return undefined
  }

  return firstMethod.price === 0
    ? t("deliverySubsteps.free", { fallback: "Bezpłatnie" })
    : format.number(firstMethod.price / CENTS_IN_ZLOTY, { currency: "PLN", style: "currency" })
}

const DeliverySubstep = ({ type }: Readonly<{ type?: string | undefined }>): JSX.Element | undefined => {
  if (type === undefined) {
    return undefined
  }

  switch (type) {
    case DELIVERY_METHOD.COURIER: {
      return <DeliveryCourier />
    }
    case DELIVERY_METHOD.LOCKER: {
      return <DeliveryLocker />
    }
    case DELIVERY_METHOD.IN_STORE: {
      return <DeliveryInStore />
    }
    default: {
      return undefined
    }
  }
}

const OptionCardSkeleton = (): JSX.Element => (
  <div className="flex items-center gap-4 rounded-none border border-border/50 bg-background px-5 py-4">
    <Skeleton className="size-4 shrink-0 rounded-full bg-muted/60" />
    <Skeleton className="size-6 shrink-0 rounded-md bg-muted/60" />
    <Skeleton className="h-3 w-32 rounded-sm bg-muted/60" />
    <Skeleton className="ml-auto h-3 w-16 rounded-sm bg-muted/60" />
  </div>
)

export const DeliveryStep = (): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const format = useFormatter()
  const { control, isPending, onNext, setValue } = useCheckoutForm()

  const { data: deliveryMethods = [], isLoading: isLoadingMethods } = useQuery(deliveryMethodsQueryOptions())

  const deliveryMethodType = useWatch({ control, name: "deliveryMethodType" })

  const handleTypeChange = useCallback(
    (type: string) => {
      setValue("deliveryMethodType", type)

      const methods = deliveryMethods.filter((m) => m.type === type)
      const [firstMethod] = methods

      if (methods.length === 1 && firstMethod !== undefined) {
        setValue("deliveryMethod", firstMethod.id)
      } else {
        setValue("deliveryMethod", "")
      }
    },
    [deliveryMethods, setValue],
  )

  const handleContinue = useCallback(
    (event: MouseEvent) => {
      void onNext(CHECKOUT_STEP_ID.DELIVERY, event)
    },
    [onNext],
  )

  return (
    <div className="flex flex-col gap-6">
      <CheckoutRadioField control={control} name="deliveryMethodType" onValueChange={handleTypeChange}>
        {isLoadingMethods ? (
          <>
            <OptionCardSkeleton />
            <OptionCardSkeleton />
            <OptionCardSkeleton />
          </>
        ) : (
          DELIVERY_METHODS.flatMap((type) => {
            const methods = deliveryMethods.filter((m) => m.type === type)
            if (methods.length === 0) {
              return []
            }

            return [
              <OptionCard
                key={type}
                value={type}
                id={`checkout-delivery-type-${type}`}
                label={t(`deliveryMethods.${type}`, { fallback: type })}
                description={getDeliveryDescription({ format, methods, t, type })}
                icon={DELIVERY_ICONS[type]}
              />,
            ]
          })
        )}
      </CheckoutRadioField>

      <DeliverySubstep type={deliveryMethodType} />

      <div>
        <Button
          size="lg"
          disabled={isPending}
          onClick={handleContinue}
          className="group min-h-11 w-full cursor-pointer rounded-none px-8 tracking-[0.2em] uppercase sm:w-auto"
        >
          {t("continueToPayment")}
          <ArrowRight aria-hidden className="ml-2 size-4 transition-transform group-hover:translate-x-1" strokeWidth={1.15} />
        </Button>
      </div>
    </div>
  )
}
