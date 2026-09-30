import { type JSX, Suspense, useCallback } from "react"

import { useQuery } from "@tanstack/react-query"
import "@tanstack/react-start/client-only"
import { cn } from "cn"
import { Pencil } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { DELIVERY_METHOD } from "~/src/modules/delivery-method/delivery-method.constants"
import { listDeliveryMethodsQuery } from "~/src/modules/delivery-method/use-cases/list-delivery-methods"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { useCheckoutForm } from "~/src/presentation/components/custom/checkout/components/checkout-form-provider"
import { type CheckoutStepConfig } from "~/src/presentation/components/custom/checkout/lib/checkout-step-loaders.client"
import { CHECKOUT_STEP_ID, type CheckoutStepId } from "~/src/presentation/components/custom/checkout/lib/checkout-steps"

const useStepSummary = (stepId: CheckoutStepId): string | undefined => {
  const { getValues } = useCheckoutForm()
  const values = getValues()
  const { data: deliveryMethods = [] } = useQuery(listDeliveryMethodsQuery())
  if (stepId === CHECKOUT_STEP_ID.CONTACT) {
    const parts = [values.email, values.phone].filter((part): part is string => typeof part === "string" && part !== "")

    return parts.length > 0 ? parts.join(", ") : undefined
  }

  if (stepId === CHECKOUT_STEP_ID.BILLING) {
    const locality = [values.postalCode, values.city].filter((part) => part !== "").join(" ")
    const parts = [values.address1, locality].filter((part) => part !== "")

    return parts.length > 0 ? parts.join(", ") : undefined
  }

  if (stepId === CHECKOUT_STEP_ID.DELIVERY) {
    const method = deliveryMethods.find((m) => m.id === values.deliveryMethod)
    if (method === undefined) {
      return undefined
    }

    const hasLocker = values.deliveryMethodType === DELIVERY_METHOD.LOCKER && typeof values.lockerId === "string" && values.lockerId !== ""

    return hasLocker ? `${method.name} ${values.lockerId}` : method.name
  }

  return undefined
}

const StepSummary = ({
  stepId,
}: Readonly<{
  stepId: CheckoutStepId
}>): JSX.Element | undefined => {
  const summary = useStepSummary(stepId)
  if (summary === undefined) {
    return undefined
  }

  return (
    <span className="hidden max-w-[55%] shrink-0 truncate text-right text-[11px] tracking-wide text-muted-foreground normal-case sm:inline-block">
      {summary}
    </span>
  )
}

const StepSkeleton = (): JSX.Element => (
  <div className="space-y-4 p-6">
    <Skeleton className="h-10 w-full rounded-none" />
    <Skeleton className="h-10 w-full rounded-none" />
    <Skeleton className="h-10 w-2/3 rounded-none" />
  </div>
)

export const CheckoutStep = ({
  stepConfig,
  stepIndex,
}: Readonly<{
  stepConfig: CheckoutStepConfig
  stepIndex: number
}>): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")
  const { activeStepIndex, onEdit } = useCheckoutForm()
  const isActive = activeStepIndex === stepIndex
  const isCompleted = activeStepIndex > stepIndex
  const stepNumber = String(stepIndex + 1).padStart(PAD_LENGTH, PAD_CHAR)
  const StepComponent = stepConfig.component
  const handleClick = useCallback(() => {
    if (isCompleted) {
      onEdit(stepConfig.id)
    }
  }, [isCompleted, onEdit, stepConfig.id])

  return (
    <div
      className={cn(
        "relative transition-all duration-300",
        isActive && "border border-border/60 bg-muted/40",
        isCompleted && !isActive && "border border-border/30 bg-muted/20",
        !isActive && !isCompleted && "border border-dashed border-border/80 bg-transparent",
      )}
    >
      <Button
        variant="ghost"
        type="button"
        onClick={handleClick}
        className={cn(
          "flex h-auto w-full cursor-default items-center justify-start gap-4 rounded-none px-6 py-5 text-left font-normal whitespace-normal transition-colors hover:bg-transparent hover:text-inherit",
          isCompleted && "cursor-pointer hover:bg-muted/30",
        )}
      >
        <span
          className={cn("shrink-0 text-sm font-light tabular-nums transition-colors", {
            "text-foreground": isActive,
            "text-muted-foreground/50": !isActive,
          })}
        >
          {stepNumber}
        </span>
        <span
          className={cn("flex-1 text-[13px] font-medium tracking-[0.18em] uppercase transition-colors", {
            "text-foreground": isActive,
            "text-muted-foreground": !isActive,
          })}
        >
          {t(stepConfig.titleKey)}
        </span>
        {isCompleted && <StepSummary stepId={stepConfig.id} />}
        {isCompleted && <Pencil className="size-3.5 shrink-0 text-muted-foreground/60" strokeWidth={1.5} />}
      </Button>

      <div
        className={cn("grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]", {
          "grid-rows-[0fr]": !isActive,
          "grid-rows-[1fr]": isActive,
        })}
      >
        <div className="overflow-hidden">
          <div className="px-6 pt-2 pb-8">
            <Suspense fallback={stepSkeletonElement}>{isActive && <StepComponent />}</Suspense>
          </div>
        </div>
      </div>
    </div>
  )
}

const PAD_LENGTH = 2

const PAD_CHAR = "0"

const stepSkeletonElement = <StepSkeleton />
