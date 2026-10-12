import { type JSX, type SyntheticEvent } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { ORDER_WITHDRAWAL_SCOPE } from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import { orderWithdrawalZodSchemas } from "~/src/modules/order-withdrawal/order-withdrawal.zod"
import { withdrawFromGuestOrderMutation } from "~/src/modules/order-withdrawal/use-cases/withdraw-from-guest-order"

import { useActionError } from "~/src/hooks/use-action-error"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"
import {
  WITHDRAWAL_VALIDATION_NAMESPACE,
  WithdrawalScopeField,
  WithdrawalTextAreaField,
} from "~/src/presentation/components/custom/pages/withdrawal/withdrawal-fields"
import { WithdrawalSubmitted } from "~/src/presentation/components/custom/pages/withdrawal/withdrawal-receipt"

export const GuestWithdrawalForm = ({ defaultOrderNumber }: Readonly<{ defaultOrderNumber: string | undefined }>): JSX.Element => {
  const t = useTranslations("pages.withdrawal")
  const actionError = useActionError()
  const form = useForm<OrderWithdrawal["guestFormValues"]>({
    defaultValues: {
      consumerName: "",
      email: "",
      items: "",
      reason: "",
      scope: ORDER_WITHDRAWAL_SCOPE.ORDER,
      ...(defaultOrderNumber === undefined ? {} : { orderNumber: defaultOrderNumber }),
    },
    mode: "onTouched",
    resolver: zodResolver(orderWithdrawalZodSchemas.guestForm),
  })
  const scope = useWatch({ control: form.control, name: "scope" })
  const withdraw = useMutation({
    ...withdrawFromGuestOrderMutation,
    onError: (error) => {
      toast.error(actionError(error))
    },
  })

  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    void form.handleSubmit((values) => {
      withdraw.mutate(values)
    })(event)
  }

  if (withdraw.isSuccess) {
    return <WithdrawalSubmitted />
  }

  return (
    <form className="mt-12 space-y-6" noValidate onSubmit={submit}>
      <AuthTextField
        autoComplete="off"
        control={form.control}
        id="withdrawal-order-number"
        label={t("page.orderNumber")}
        name="orderNumber"
        required
        validationNamespace={WITHDRAWAL_VALIDATION_NAMESPACE}
      />
      <AuthTextField
        autoComplete="email"
        control={form.control}
        id="withdrawal-email"
        label={t("page.email")}
        name="email"
        required
        type="email"
        validationNamespace={WITHDRAWAL_VALIDATION_NAMESPACE}
      />
      <AuthTextField
        autoComplete="name"
        control={form.control}
        id="withdrawal-name"
        label={t("form.name")}
        name="consumerName"
        required
        validationNamespace={WITHDRAWAL_VALIDATION_NAMESPACE}
      />
      <WithdrawalScopeField control={form.control} idPrefix="withdrawal-scope" name="scope" />
      {scope === ORDER_WITHDRAWAL_SCOPE.ITEMS ? (
        <WithdrawalTextAreaField
          control={form.control}
          hint={t("page.itemsHint")}
          id="withdrawal-items"
          label={t("page.items")}
          name="items"
        />
      ) : undefined}
      <WithdrawalTextAreaField
        control={form.control}
        hint={t("form.reasonHint")}
        id="withdrawal-reason"
        label={t("form.reason")}
        name="reason"
      />

      <Button className="w-full gap-2.5 tracking-wide" disabled={withdraw.isPending} size="xl" type="submit">
        {withdraw.isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
        {withdraw.isPending ? t("form.submitting") : t("form.submit")}
      </Button>
    </form>
  )
}
