import { type JSX, useCallback } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CreditCard, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { PAYMENT_METHOD_QUERY_KEYS } from "~/src/modules/payment/payment.constants"
import { type Payment } from "~/src/modules/payment/payment.types"
import { deleteSavedPaymentMethodMutation } from "~/src/modules/payment/use-cases/delete-saved-payment-method"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"

const MONTH_PAD = 2

export const SavedCardList = ({ methods }: Readonly<SavedCardListProps>): JSX.Element => {
  const t = useTranslations("pages.account.payment")

  if (methods.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CreditCard className="size-8 text-muted-foreground/30" strokeWidth={1} />
        <p className="max-w-md text-sm text-muted-foreground">{t("empty")}</p>
      </div>
    )
  }

  return (
    <ul className="divide-y divide-border">
      {methods.map((method) => (
        <SavedCardRow key={method.id} method={method} />
      ))}
    </ul>
  )
}

const SavedCardRow = ({ method }: Readonly<{ method: Payment["savedMethod"] }>): JSX.Element => {
  const t = useTranslations("pages.account.payment")
  const queryClient = useQueryClient()
  const remove = useMutation(deleteSavedPaymentMethodMutation)

  const handleRemove = useCallback(() => {
    remove.mutate(
      { paymentMethodId: method.id },
      {
        onError: () => {
          toast.error(t("removeError"))
        },
        onSuccess: () => {
          toast.success(t("removed"))
          void queryClient.invalidateQueries({ queryKey: PAYMENT_METHOD_QUERY_KEYS.SAVED })
        },
      },
    )
  }, [method.id, queryClient, remove, t])

  return (
    <li className="flex items-center gap-4 py-4">
      <CreditCard className="size-4 shrink-0 text-muted-foreground/40" strokeWidth={1.5} />
      <div className="min-w-0 flex-1">
        <p className="text-[14px] capitalize">
          {method.brand} •••• {method.last4}
        </p>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t("expires")} {String(method.expMonth).padStart(MONTH_PAD, "0")}/{method.expYear}
        </p>
      </div>
      {method.isExpired && (
        <Badge className="text-[10px]" variant="destructive">
          {t("expired")}
        </Badge>
      )}
      <Button
        aria-label={t("remove")}
        className="size-8 shrink-0 text-muted-foreground"
        disabled={remove.isPending}
        onClick={handleRemove}
        size="icon"
        variant="ghost"
      >
        <Trash2 className="size-3.5" strokeWidth={1.5} />
      </Button>
    </li>
  )
}

interface SavedCardListProps {
  readonly methods: readonly Payment["savedMethod"][]
}
