import { type JSX, useCallback, useId, useState } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { STORE_CURRENCY_CODE } from "~/src/modules/_core/constants/currency"
import { formatMinorUnitsToMoneyInput, parseMoneyInputToMinorUnits } from "~/src/modules/_core/utils/currency"
import { STORE_SETTING_QUERY_KEYS } from "~/src/modules/store-setting/store-setting.constants"
import { getAdminFreeDeliveryQuery } from "~/src/modules/store-setting/use-cases/get-free-delivery"
import { setFreeDeliveryThresholdMutation } from "~/src/modules/store-setting/use-cases/set-free-delivery-threshold"

import { useActionError } from "~/src/hooks/use-action-error"
import { useFormatLocale } from "~/src/hooks/use-display-format"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Label } from "~/src/presentation/components/shadcn/label"
import { Switch } from "~/src/presentation/components/shadcn/switch"

import { ADMIN_DIALOG_LABEL_CLASS } from "~/src/presentation/components/custom/pages/admin/_styles/admin-layout.styles"
import { CatalogMoneyInput } from "~/src/presentation/components/custom/pages/admin/catalog/form/components/catalog-money-input"
import { SettingsCard } from "~/src/presentation/components/custom/pages/admin/settings/settings-card"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

export const SettingsFreeDeliveryCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.delivery.freeDelivery")
  const formatLocale = useFormatLocale()
  const actionError = useActionError()
  const queryClient = useQueryClient()
  const enabledId = useId()
  const { data } = useSuspenseQuery(getAdminFreeDeliveryQuery())
  const [enabled, setEnabled] = useState(data.threshold !== undefined)
  const [threshold, setThreshold] = useState(data.threshold)
  const [error, setError] = useState<string>()
  const save = useMutation({
    ...setFreeDeliveryThresholdMutation,
    onError: (mutationError) => {
      toast.error(actionError(mutationError))
    },
    onSuccess: async () => {
      await Promise.all([
        syncQueryInvalidation(queryClient, STORE_SETTING_QUERY_KEYS.ADMIN.FREE_DELIVERY),
        syncQueryInvalidation(queryClient, STORE_SETTING_QUERY_KEYS.FREE_DELIVERY),
      ])
      toast.success(t("saved"))
    },
  })

  const submit = useCallback(() => {
    if (enabled && (threshold === undefined || threshold < 1)) {
      setError("thresholdInvalid")

      return
    }

    setError(undefined)
    save.mutate({ threshold: enabled ? threshold : undefined })
  }, [enabled, save, threshold])

  return (
    <SettingsCard
      action={
        <Button className="shrink-0 gap-1.5 self-start" disabled={save.isPending} onClick={submit} size="sm" variant="outline">
          {save.isPending && <Loader2 aria-hidden className="size-3.5 animate-spin" />}
          {t("save")}
        </Button>
      }
      description={t("description")}
      title={t("title")}
    >
      <div className="space-y-4 px-4 py-4 lg:px-5">
        <div className="flex items-center justify-between gap-4">
          <Label className={ADMIN_DIALOG_LABEL_CLASS} htmlFor={enabledId}>
            {t("enabled")}
          </Label>
          <Switch checked={enabled} id={enabledId} onCheckedChange={setEnabled} />
        </div>
        {enabled && (
          <div className="space-y-2">
            <Label className={ADMIN_DIALOG_LABEL_CLASS}>{t("threshold")}</Label>
            <div className="relative max-w-60">
              <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-[13px] text-muted-foreground">
                {STORE_CURRENCY_CODE}
              </span>
              <CatalogMoneyInput
                aria-label={t("threshold")}
                ariaInvalid={error !== undefined}
                className="pl-12"
                onValueChange={(next) => {
                  setThreshold(next === "" ? undefined : parseMoneyInputToMinorUnits(next, STORE_CURRENCY_CODE, formatLocale))
                }}
                value={threshold === undefined ? "" : formatMinorUnitsToMoneyInput(threshold, STORE_CURRENCY_CODE, formatLocale)}
              />
            </div>
            <ValidationFieldError message={error} namespace="pages.admin.settings.delivery.freeDelivery.validation" />
          </div>
        )}
      </div>
    </SettingsCard>
  )
}
