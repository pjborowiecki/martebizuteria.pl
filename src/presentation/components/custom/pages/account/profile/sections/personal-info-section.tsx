import { type JSX, useCallback, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { createClientOnlyFn } from "@tanstack/react-start"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"

import { CUSTOMER_ACCOUNT_QUERY_KEYS } from "~/src/modules/customer-account/customer-account.constants"
import { type CustomerAccount } from "~/src/modules/customer-account/customer-account.types"
import { customerAccountZodSchemas } from "~/src/modules/customer-account/customer-account.zod"
import { updateCustomerPhoneMutation } from "~/src/modules/customer-account/use-cases/update-customer-phone"

import { Separator } from "~/src/presentation/components/shadcn/separator"

import { ProfileField } from "~/src/presentation/components/custom/pages/account/profile/profile-field"
import { type EditableField } from "~/src/presentation/components/custom/pages/account/profile/profile-form.types"
import { ReadOnlyField } from "~/src/presentation/components/custom/pages/account/profile/read-only-field"

const updateUser = createClientOnlyFn((input: Parameters<typeof authClient.updateUser>[0]) => authClient.updateUser(input))

export const PersonalInfoSection = ({
  profile,
}: Readonly<{
  profile: CustomerAccount["profile"] | undefined
}>): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<EditableField | undefined>()

  const form = useForm<CustomerAccount["profileForm"]>({
    defaultValues: {
      name: profile?.name ?? "",
      phone: profile?.phone ?? "",
    },
    resolver: zodResolver(customerAccountZodSchemas.profileForm),
  })

  const updatePhoneMutation = useMutation({
    ...updateCustomerPhoneMutation,
    onError: () => {
      toast.error(t("saveError"))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: CUSTOMER_ACCOUNT_QUERY_KEYS.PROFILE,
      })
      toast.success(t("saved"))
    },
  })

  const cancelField = useCallback(
    (field: EditableField) => {
      form.resetField(field)
      setEditing(undefined)
    },
    [form],
  )

  const saveField = useCallback(
    async (field: EditableField) => {
      if (!(await form.trigger(field))) {
        return
      }

      const value = form.getValues(field)

      if (field === "phone") {
        try {
          await updatePhoneMutation.mutateAsync({ phone: value })
        } catch {
          return
        }
      } else {
        const { error } = await updateUser({
          name: value,
        })

        if (error) {
          toast.error(t("saveError"))

          return
        }
        toast.success(t("saved"))
      }

      form.resetField(field, {
        defaultValue: value,
      })
      setEditing(undefined)
    },
    [form, t, updatePhoneMutation],
  )

  if (profile === undefined) {
    return <p className="text-sm text-muted-foreground">{t("saveError")}</p>
  }

  return (
    <section>
      <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">{t("personalInfo")}</h2>
      <Separator className="mt-3 mb-0" />
      <div className="divide-y divide-border">
        <ProfileField
          control={form.control}
          editing={editing === "name"}
          field="name"
          label={t("name")}
          onCancel={cancelField}
          onEdit={setEditing}
          onSave={saveField}
          type="text"
        />
        <ReadOnlyField label={t("email")} value={profile.email} />
        <ProfileField
          control={form.control}
          editing={editing === "phone"}
          field="phone"
          label={t("phone")}
          onCancel={cancelField}
          onEdit={setEditing}
          onSave={saveField}
          type="tel"
        />
      </div>
    </section>
  )
}
