import { type JSX, useCallback } from "react"

import { useMutation, useQuery } from "@tanstack/react-query"
import { createClientOnlyFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { Label } from "~/src/presentation/components/shadcn/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"

const updateUser = createClientOnlyFn((input: Parameters<typeof authClient.updateUser>[0]) => authClient.updateUser(input))

const PREF_SELECT_TRIGGER_CLASS =
  "mt-1.5 flex h-auto w-full items-center justify-between rounded-none border-0 border-b border-border bg-transparent p-0 pb-2 text-[14px] shadow-none transition-colors outline-none hover:bg-transparent focus:border-foreground focus:ring-0 focus-visible:border-foreground focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=open]:border-foreground"

const TIMEZONE_OPTIONS: readonly string[] =
  typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : I18N.TIME_ZONES

export const TimezoneField = (): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const { data: session } = useQuery(getCurrentSessionQuery)
  const current = session?.user.timezone ?? I18N.DEFAULT_TIMEZONE
  const mutation = useMutation({
    mutationFn: async (timezone: string) => {
      const { error } = await updateUser({
        timezone,
      })

      if (error) {
        throw new Error(error.message ?? "Failed to update timezone")
      }
    },
    onError: () => {
      toast.error(t("timezoneError"))
    },
    onSuccess: () => {
      toast.success(t("timezoneSaved"))
    },
  })

  const handleChange = useCallback(
    (val: string | null) => {
      if (val !== null && val !== current) {
        mutation.mutate(val)
      }
    },
    [current, mutation],
  )

  return (
    <div className="py-4">
      <Label className="text-[11px] tracking-widest text-muted-foreground uppercase">{t("timezone")}</Label>
      <Select value={current} onValueChange={handleChange} disabled={mutation.isPending}>
        <SelectTrigger className={PREF_SELECT_TRIGGER_CLASS}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TIMEZONE_OPTIONS.map((tz) => (
            <SelectItem key={tz} value={tz}>
              {tz}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
