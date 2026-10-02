import { useMutation, useQueryClient } from "@tanstack/react-query"
import { type UseFormReturn } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { CONTENT_PAGE_QUERY_KEYS, type ContentPageHandle } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"
import { getAdminContentPageQuery } from "~/src/modules/content-page/use-cases/get-admin-content-page"
import { updateContentPageMutation } from "~/src/modules/content-page/use-cases/update-content-page"

import {
  conflictToastId,
  editsMadeSince,
  localesWithErrors,
} from "~/src/presentation/components/custom/pages/admin/content/content-page-editor.utils"

export const useContentPageSave = ({ form, handle, onInvalidLocale, onReload }: Readonly<UseContentPageSaveOptions>) => {
  const t = useTranslations("pages.admin.content.editor")
  const queryClient = useQueryClient()
  const { isPending, mutate } = useMutation(updateContentPageMutation)

  const notifyFailure = (error: Error): void => {
    if (errorCode(error) === ERROR_CODES.CONFLICT) {
      toast.error(t("toast.conflictTitle"), {
        action: {
          label: t("toast.reload"),
          onClick: () => {
            void onReload()
          },
        },
        description: t("toast.conflictDescription"),
        duration: Number.POSITIVE_INFINITY,
        id: conflictToastId(handle),
      })

      return
    }
    toast.error(t("toast.errorTitle"), { description: t("toast.errorDescription") })
  }

  const store = (values: ContentPage["formValues"], updatedAt: Date): void => {
    const edits = editsMadeSince(values, form.getValues())
    form.reset({ ...values, expectedUpdatedAt: updatedAt })
    for (const { field, locale, value } of edits) {
      form.setValue(`${field}.${locale}`, value, { shouldDirty: true })
    }
    queryClient.setQueryData(getAdminContentPageQuery(handle).queryKey, (page) =>
      page === undefined ? page : { ...page, bodies: values.bodies, descriptions: values.descriptions, titles: values.titles, updatedAt },
    )
    void queryClient.invalidateQueries({ queryKey: CONTENT_PAGE_QUERY_KEYS.ADMIN.ALL })
    toast.success(t("toast.savedTitle"), { description: t("toast.savedDescription") })
  }

  const save = form.handleSubmit(
    (values) => {
      mutate(
        { ...values, handle },
        {
          onError: notifyFailure,
          onSuccess: ({ updatedAt }) => {
            store(values, updatedAt)
          },
        },
      )
    },
    (errors) => {
      const locales = localesWithErrors(errors)
      const [firstLocale] = locales
      if (firstLocale !== undefined) {
        onInvalidLocale(firstLocale)
      }
      toast.error(t("toast.invalidTitle"), {
        description: t("toast.invalidDescription", { locales: locales.map((locale) => t(`localeNames.${locale}`)).join(", ") }),
      })
    },
  )

  return { isPending, save }
}

interface UseContentPageSaveOptions {
  readonly form: UseFormReturn<ContentPage["formValues"]>
  readonly handle: ContentPageHandle
  readonly onInvalidLocale: (locale: SupportedLocale) => void
  readonly onReload: () => Promise<void>
}
