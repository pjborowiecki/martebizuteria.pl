import { useCallback } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientOnlyFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { updateCustomerPhoneMutation } from "~/src/modules/customer-account/use-cases/update-customer-phone"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

const updateUser = createClientOnlyFn((input: Parameters<typeof authClient.updateUser>[0]) => authClient.updateUser(input))

export const useSaveProfileField = (): ((field: ProfileFieldName, value: string) => Promise<boolean>) => {
  const t = useTranslations("pages.admin.settings.account.profile")
  const queryClient = useQueryClient()
  const updatePhone = useMutation(updateCustomerPhoneMutation)

  const saveValue = useCallback(
    async (field: ProfileFieldName, value: string): Promise<boolean> => {
      if (field === "phone") {
        return updatePhone.mutateAsync({ phone: value }).then(
          () => true,
          () => false,
        )
      }

      const { error } = await updateUser({ name: value })

      return !error
    },
    [updatePhone],
  )

  return useCallback(
    async (field: ProfileFieldName, value: string): Promise<boolean> => {
      if (!(await saveValue(field, value))) {
        toast.error(t("saveError"))

        return false
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE }),
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.CURRENT }),
      ])
      toast.success(t("saved"))

      return true
    },
    [queryClient, saveValue, t],
  )
}

export type ProfileFieldName = "name" | "phone"
