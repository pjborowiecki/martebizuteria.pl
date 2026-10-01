import { type JSX, useCallback, useId } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientOnlyFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { TIMEZONES } from "~/src/modules/_core/constants/timezone"
import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { Label } from "~/src/presentation/components/shadcn/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

const updateUser = createClientOnlyFn((input: Parameters<typeof authClient.updateUser>[0]) => authClient.updateUser(input))

const PREF_SELECT_TRIGGER_CLASS =
  "mt-1.5 flex h-auto w-full items-center justify-between rounded-none border-0 border-b border-border bg-transparent p-0 pb-2 text-[14px] shadow-none transition-colors outline-none hover:bg-transparent focus:border-foreground focus:ring-0 focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-foreground"

export const TimezoneField = ({ timezone }: Readonly<{ timezone?: string | undefined }>): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const fieldId = useId()
  const queryClient = useQueryClient()
  const current = timezone ?? I18N.DEFAULT_TIMEZONE
  const mutation = useMutation({
    mutationFn: async (nextTimezone: string) => {
      const { error } = await updateUser({
        timezone: nextTimezone,
      })

      if (error) {
        throw new Error(error.message ?? "Failed to update timezone")
      }
    },
    onError: () => {
      toast.error(t("timezoneError"))
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE }),
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.CURRENT }),
      ])
      toast.success(t("timezoneSaved"))
    },
  })

  const handleChange = useCallback(
    (value: string | null) => {
      if (value !== null && value !== current) {
        mutation.mutate(value)
      }
    },
    [current, mutation],
  )

  return (
    <div className="py-4">
      <Label className="text-[11px] tracking-widest text-muted-foreground uppercase" htmlFor={fieldId}>
        {t("timezone")}
      </Label>
      <Select disabled={mutation.isPending} onValueChange={handleChange} value={current}>
        <SelectTrigger className={PREF_SELECT_TRIGGER_CLASS} id={fieldId}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIMEZONES.map((zone) => (
            <SelectItem key={zone.iana} value={zone.iana}>
              {zone.iana}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
