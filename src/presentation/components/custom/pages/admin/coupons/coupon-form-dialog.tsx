import { type JSX, type SyntheticEvent, useCallback } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Controller, useForm } from "react-hook-form"
import { useTranslations } from "use-intl/react"

import { DISCOUNT_PERCENTAGE_MAX, DISCOUNT_TYPE, DISCOUNT_TYPES } from "~/src/modules/discount/discount.constants"
import { type Discount } from "~/src/modules/discount/discount.types"
import { discountZodSchemas } from "~/src/modules/discount/discount.zod"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Checkbox } from "~/src/presentation/components/shadcn/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Label } from "~/src/presentation/components/shadcn/label"
import { NativeSelect, NativeSelectOption } from "~/src/presentation/components/shadcn/native-select"

const FieldNote = ({ error, hint }: Readonly<Pick<FieldProps, "error" | "hint">>): JSX.Element | undefined => {
  if (error !== undefined) {
    return <p className="text-[11px] text-destructive">{error}</p>
  }

  return hint === undefined ? undefined : <p className="text-[11px] text-muted-foreground">{hint}</p>
}

const Field = ({ children, error, hint, htmlFor, label }: Readonly<FieldProps>): JSX.Element => (
  <div className="space-y-1.5">
    <Label htmlFor={htmlFor}>{label}</Label>
    {children}
    <FieldNote error={error} hint={hint} />
  </div>
)

export const CouponFormDialog = ({ coupon, isPending, onOpenChange, onSubmit, open }: Readonly<CouponFormDialogProps>): JSX.Element => {
  const t = useTranslations("pages.admin.coupons.form")
  const tv = useTranslations("pages.admin.coupons")
  const { control, formState, handleSubmit, register, watch } = useForm({
    defaultValues: toDefaultValues(coupon),
    resolver: zodResolver(discountZodSchemas.adminDiscountFormValues),
  })
  const type = watch("type")
  const isPercentage = type === DISCOUNT_TYPE.PERCENTAGE
  const isFreeShipping = type === DISCOUNT_TYPE.FREE_SHIPPING
  const handleFormSubmit = useCallback(
    (event: SyntheticEvent<HTMLFormElement>) => {
      event.preventDefault()
      void handleSubmit(onSubmit)(event)
    },
    [handleSubmit, onSubmit],
  )
  const errorFor = useCallback(
    (key: "code" | "endsAt" | "value"): string | undefined => {
      const message = formState.errors[key]?.message

      return message === undefined || !isCouponValidationKey(message) ? undefined : tv(message)
    },
    [formState.errors, tv],
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <form onSubmit={handleFormSubmit}>
          <DialogHeader>
            <DialogTitle>{coupon === undefined ? t("createTitle") : t("editTitle")}</DialogTitle>
            <DialogDescription>{coupon === undefined ? t("createDescription") : t("editDescription")}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Field error={errorFor("code")} hint={t("codeHint")} htmlFor="coupon-code" label={t("code")}>
              <Input autoComplete="off" className="uppercase" id="coupon-code" {...register("code")} />
            </Field>

            <Field htmlFor="coupon-description" label={t("description")}>
              <Input autoComplete="off" id="coupon-description" {...register("description")} />
            </Field>

            <Field htmlFor="coupon-type" label={t("type")}>
              <NativeSelect id="coupon-type" {...register("type")}>
                {DISCOUNT_TYPES.map((option) => (
                  <NativeSelectOption key={option} value={option}>
                    {tv(`type.${option}`)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>

            {isFreeShipping ? (
              <p className="text-[12px] text-muted-foreground">{t("freeShippingNote")}</p>
            ) : (
              <Field
                error={errorFor("value")}
                hint={isPercentage ? undefined : t("amountInMinorUnits")}
                htmlFor="coupon-value"
                label={isPercentage ? t("percentageValue") : t("amountValue")}
              >
                <Input
                  id="coupon-value"
                  max={isPercentage ? DISCOUNT_PERCENTAGE_MAX : undefined}
                  min={1}
                  type="number"
                  {...register("value", { valueAsNumber: true })}
                />
              </Field>
            )}

            {isPercentage && (
              <Field hint={t("maxDiscountAmountHint")} htmlFor="coupon-max" label={t("maxDiscountAmount")}>
                <Input id="coupon-max" min={1} type="number" {...register("maxDiscountAmount", { setValueAs: toOptionalNumber })} />
              </Field>
            )}

            <Field hint={t("minOrderTotalHint")} htmlFor="coupon-min-order" label={t("minOrderTotal")}>
              <Input id="coupon-min-order" min={1} type="number" {...register("minOrderTotal", { setValueAs: toOptionalNumber })} />
            </Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field hint={t("usageLimitHint")} htmlFor="coupon-usage-limit" label={t("usageLimit")}>
                <Input id="coupon-usage-limit" min={1} type="number" {...register("usageLimit", { setValueAs: toOptionalNumber })} />
              </Field>
              <Field hint={t("perCustomerLimitHint")} htmlFor="coupon-per-customer" label={t("perCustomerLimit")}>
                <Input id="coupon-per-customer" min={1} type="number" {...register("perCustomerLimit", { setValueAs: toOptionalNumber })} />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field htmlFor="coupon-starts" label={t("startsAt")}>
                <Input id="coupon-starts" type="datetime-local" {...register("startsAt", { setValueAs: toIsoOrUndefined })} />
              </Field>
              <Field error={errorFor("endsAt")} htmlFor="coupon-ends" label={t("endsAt")}>
                <Input id="coupon-ends" type="datetime-local" {...register("endsAt", { setValueAs: toIsoOrUndefined })} />
              </Field>
            </div>

            <div className="flex items-start gap-3">
              <Controller
                control={control}
                name="isActive"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    id="coupon-active"
                    onCheckedChange={(checked) => {
                      field.onChange(checked)
                    }}
                  />
                )}
              />
              <div className="space-y-1">
                <Label htmlFor="coupon-active">{t("isActive")}</Label>
                <p className="text-[11px] text-muted-foreground">{t("isActiveHint")}</p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              disabled={isPending}
              onClick={() => {
                onOpenChange(false)
              }}
              type="button"
              variant="outline"
            >
              {t("cancel")}
            </Button>
            <Button className="gap-1.5" disabled={isPending} type="submit">
              {isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
              {t("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

const COUPON_VALIDATION_KEYS = [
  "validation.amountRequired",
  "validation.codeCharacters",
  "validation.codeTooLong",
  "validation.codeTooShort",
  "validation.endBeforeStart",
  "validation.percentageRange",
] as const

const isCouponValidationKey = (value: string): value is (typeof COUPON_VALIDATION_KEYS)[number] =>
  COUPON_VALIDATION_KEYS.some((key) => key === value)

const toOptionalNumber = (value: unknown): number | undefined => {
  const parsed = typeof value === "string" && value.trim() !== "" ? Number(value) : value

  return typeof parsed === "number" && Number.isFinite(parsed) ? parsed : undefined
}

const toIsoOrUndefined = (value: unknown): string | undefined => {
  if (typeof value !== "string" || value.trim() === "") {
    return undefined
  }

  const parsed = new Date(value)

  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString()
}

const toLocalInputValue = (value: Date | undefined): string => {
  if (value === undefined) {
    return ""
  }

  const offsetMs = value.getTimezoneOffset() * MS_PER_MINUTE

  return new Date(value.getTime() - offsetMs).toISOString().slice(0, LOCAL_INPUT_LENGTH)
}

const toDefaultValues = (coupon: Discount["adminListItem"] | undefined): Discount["adminFormValues"] => ({
  code: coupon?.code ?? "",
  description: coupon?.description ?? "",
  endsAt: toLocalInputValue(coupon?.endsAt),
  isActive: coupon?.isActive ?? true,
  maxDiscountAmount: coupon?.maxDiscountAmountMinorUnits,
  minOrderTotal: coupon?.minOrderTotalMinorUnits,
  perCustomerLimit: coupon?.perCustomerLimit,
  startsAt: toLocalInputValue(coupon?.startsAt),
  type: coupon?.type ?? DISCOUNT_TYPE.PERCENTAGE,
  usageLimit: coupon?.usageLimit,
  value: coupon?.value ?? 0,
})

const MS_PER_MINUTE = 60_000

const LOCAL_INPUT_LENGTH = 16

interface FieldProps {
  readonly children: JSX.Element
  readonly error?: string | undefined
  readonly hint?: string | undefined
  readonly htmlFor: string
  readonly label: string
}

interface CouponFormDialogProps {
  readonly coupon: Discount["adminListItem"] | undefined
  readonly isPending: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly onSubmit: (values: Discount["adminFormValues"]) => void
  readonly open: boolean
}
