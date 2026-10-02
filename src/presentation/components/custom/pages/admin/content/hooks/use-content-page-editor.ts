import { type KeyboardEvent, type SyntheticEvent, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useBlocker } from "@tanstack/react-router"
import { useForm } from "react-hook-form"
import { toast } from "sonner"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type ContentPageHandle } from "~/src/modules/content-page/content-page.constants"
import { type ContentPage } from "~/src/modules/content-page/content-page.types"
import { contentPageZodSchemas } from "~/src/modules/content-page/content-page.zod"
import { getAdminContentPageQuery } from "~/src/modules/content-page/use-cases/get-admin-content-page"

import {
  conflictToastId,
  toContentPageFormValues,
} from "~/src/presentation/components/custom/pages/admin/content/content-page-editor.utils"
import { useContentPageSave } from "~/src/presentation/components/custom/pages/admin/content/hooks/use-content-page-save"

const contentPageResolver = zodResolver(contentPageZodSchemas.formValues)

const isSaveShortcut = (event: KeyboardEvent): boolean => (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s"

export const useContentPageEditor = (handle: ContentPageHandle) => {
  const queryClient = useQueryClient()
  const { data: page } = useSuspenseQuery(getAdminContentPageQuery(handle))
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(I18N.DEFAULT_LOCALE)
  const [revision, setRevision] = useState(0)
  const form = useForm<ContentPage["formValues"]>({ defaultValues: toContentPageFormValues(page), resolver: contentPageResolver })
  const { isDirty } = form.formState
  const leaveGuard = useBlocker({ enableBeforeUnload: () => isDirty, shouldBlockFn: () => isDirty, withResolver: true })

  const reload = async (): Promise<void> => {
    const fresh = await queryClient.query({ ...getAdminContentPageQuery(handle), staleTime: 0 })
    form.reset(toContentPageFormValues(fresh))
    setRevision((current) => current + 1)
    toast.dismiss(conflictToastId(handle))
  }

  const { isPending, save } = useContentPageSave({ form, handle, onInvalidLocale: setActiveLocale, onReload: reload })

  const submit = (event: SyntheticEvent<HTMLFormElement>): void => {
    void save(event)
  }

  const saveOnShortcut = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (!isSaveShortcut(event)) {
      return
    }

    event.preventDefault()
    if (isDirty && !isPending) {
      void save()
    }
  }

  return { activeLocale, form, isPending, leaveGuard, page, revision, saveOnShortcut, setActiveLocale, submit }
}
