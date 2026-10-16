import { useCallback } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { DISPLAY_PREFERENCES_QUERY_KEY } from "~/src/integrations/use-intl/i18n.display"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { updateDisplayPreferenceMutation } from "~/src/modules/user/use-cases/update-display-preference"

import { AUTOMATIC_PREFERENCE } from "~/src/presentation/components/custom/display-preferences/use-display-preference-options"

export const useSaveDisplayPreference = (preference: DisplayPreferenceName): SaveDisplayPreference => {
  const t = useTranslations("components.custom.displayPreferences")
  const queryClient = useQueryClient()
  const { isPending, mutate } = useMutation({
    ...updateDisplayPreferenceMutation,
    onError: () => {
      toast.error(t("error"))
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: DISPLAY_PREFERENCES_QUERY_KEY }),
        queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE }),
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.CURRENT }),
      ])
      toast.success(t("saved"))
    },
  })

  const save = useCallback(
    (choice: string | null, current: string) => {
      if (choice !== null && choice !== current) {
        mutate({ preference, value: choice === AUTOMATIC_PREFERENCE ? "" : choice })
      }
    },
    [mutate, preference],
  )

  return { isSaving: isPending, save }
}

export type DisplayPreferenceName = "formatLocale" | "timeZone"

interface SaveDisplayPreference {
  readonly isSaving: boolean
  readonly save: (choice: string | null, current: string) => void
}
