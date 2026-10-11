import { type JSX, type SyntheticEvent } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { useForm, useWatch } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import {
  ORDER_WITHDRAWAL_OUTCOME,
  ORDER_WITHDRAWAL_QUERY_KEYS,
  ORDER_WITHDRAWAL_SCOPE,
} from "~/src/modules/order-withdrawal/order-withdrawal.constants"
import { type OrderWithdrawal } from "~/src/modules/order-withdrawal/order-withdrawal.types"
import { orderWithdrawalZodSchemas } from "~/src/modules/order-withdrawal/order-withdrawal.zod"
import { withdrawFromCustomerOrderMutation } from "~/src/modules/order-withdrawal/use-cases/withdraw-from-customer-order"

import { useActionError } from "~/src/hooks/use-action-error"

import { BUSINESS } from "~/src/presentation/branding/business"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"

import { OrderWithdrawalItemsField } from "~/src/presentation/components/custom/pages/account/orders/order-withdrawal-items-field"
import { AuthTextField } from "~/src/presentation/components/custom/pages/auth/auth-fields"
import {
  WITHDRAWAL_VALIDATION_NAMESPACE,
  WithdrawalScopeField,
  WithdrawalTextAreaField,
} from "~/src/presentation/components/custom/pages/withdrawal/withdrawal-fields"
import { useDescribeWithdrawalReceipt } from "~/src/presentation/components/custom/pages/withdrawal/withdrawal-receipt"

export const OrderWithdrawalDialog = ({ onOpenChange, open, order, withdrawal }: Readonly<OrderWithdrawalDialogProps>): JSX.Element => {
  const t = useTranslations("pages.withdrawal")
  const queryClient = useQueryClient()
  const actionError = useActionError()
  const describeReceipt = useDescribeWithdrawalReceipt()
  const form = useForm<OrderWithdrawal["customerFormValues"]>({
    defaultValues: { consumerName: withdrawal.consumerName, orderItemIds: [], reason: "", scope: ORDER_WITHDRAWAL_SCOPE.ORDER },
    mode: "onTouched",
    resolver: zodResolver(orderWithdrawalZodSchemas.customerForm),
  })
  const scope = useWatch({ control: form.control, name: "scope" })
  const withdraw = useMutation({
    ...withdrawFromCustomerOrderMutation,
    onError: (error) => {
      toast.error(actionError(error))
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: [...ORDER_WITHDRAWAL_QUERY_KEYS.CUSTOMER_ORDER, order.id] })
      form.reset()
      onOpenChange(false)
      if (result.outcome === ORDER_WITHDRAWAL_OUTCOME.RECORDED) {
        toast.success(t("result.recorded"), { description: describeReceipt(result.receipt) })

        return
      }

      toast.error(t(`result.${result.outcome}`, { shopEmail: BUSINESS.EMAIL }))
    },
  })

  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    void form.handleSubmit((values) => {
      withdraw.mutate({ ...values, orderId: order.id })
    })(event)
  }

  const handleOpenChange = (nextOpen: boolean): void => {
    if (withdraw.isPending) {
      return
    }

    if (!nextOpen) {
      form.reset()
    }
    onOpenChange(nextOpen)
  }

  const cancel = (): void => {
    handleOpenChange(false)
  }

  return (
    <Dialog onOpenChange={handleOpenChange} open={open}>
      <DialogContent className="max-h-[calc(100dvh-12rem)] overflow-y-auto sm:max-w-lg">
        <form noValidate onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{t("account.action")}</DialogTitle>
            <DialogDescription>
              {t("account.dialogDescription", { email: withdrawal.email, orderNumber: order.orderNumber })}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-5">
            <AuthTextField
              autoComplete="name"
              control={form.control}
              id="order-withdrawal-name"
              label={t("form.name")}
              name="consumerName"
              required
              validationNamespace={WITHDRAWAL_VALIDATION_NAMESPACE}
            />
            <WithdrawalScopeField control={form.control} idPrefix="order-withdrawal-scope" name="scope" />
            {scope === ORDER_WITHDRAWAL_SCOPE.ITEMS ? <OrderWithdrawalItemsField control={form.control} items={order.items} /> : undefined}
            <WithdrawalTextAreaField
              control={form.control}
              hint={t("form.reasonHint")}
              id="order-withdrawal-reason"
              label={t("form.reason")}
              name="reason"
            />
          </div>

          <DialogFooter>
            <Button disabled={withdraw.isPending} onClick={cancel} type="button" variant="outline">
              {t("account.cancel")}
            </Button>
            <Button className="gap-1.5" disabled={withdraw.isPending} type="submit">
              {withdraw.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("form.submit")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface OrderWithdrawalDialogProps {
  readonly onOpenChange: (open: boolean) => void
  readonly open: boolean
  readonly order: CustomerAccount["orderDetail"]
  readonly withdrawal: OrderWithdrawal["customerOrder"]
}
