import { useCallback, useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientOnlyFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { updateCustomerPhoneMutation } from "~/src/modules/user/use-cases/update-customer-phone"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import { type User } from "~/src/modules/user/user.types"

const updateUser = createClientOnlyFn((input: Parameters<typeof authClient.updateUser>[0]) => authClient.updateUser(input))

const samePhone = (next: string, stored: string | undefined): boolean => (stored === undefined ? next === "" : next === stored)

export const useSaveProfile = (profile: Pick<User["customerProfile"], "name" | "phone">): SaveProfile => {
  const t = useTranslations("pages.admin.settings.account.profile")
  const queryClient = useQueryClient()
  const updatePhone = useMutation(updateCustomerPhoneMutation)
  const [isPending, setIsPending] = useState(false)

  const save = useCallback(
    async (values: ProfileValues): Promise<boolean> => {
      setIsPending(true)
      const saved = await Promise.all([
        values.name === profile.name ? true : updateUser({ name: values.name }).then(({ error }) => !error),
        samePhone(values.phone, profile.phone)
          ? true
          : updatePhone.mutateAsync({ phone: values.phone }).then(
              () => true,
              () => false,
            ),
      ])
      setIsPending(false)
      if (saved.includes(false)) {
        toast.error(t("saveError"))

        return false
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.CUSTOMER.PROFILE }),
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.CURRENT }),
      ])
      toast.success(t("saved"))

      return true
    },
    [profile.name, profile.phone, queryClient, t, updatePhone],
  )

  return { isPending, save }
}

export interface ProfileValues {
  readonly name: string
  readonly phone: string
}

interface SaveProfile {
  readonly isPending: boolean
  readonly save: (values: ProfileValues) => Promise<boolean>
}
