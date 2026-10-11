import { useRef, useState } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useMutation } from "@tanstack/react-query"
import { useBlocker } from "@tanstack/react-router"
import { type FieldErrors, useForm } from "react-hook-form"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"
import { newsletterCampaignZodSchemas } from "~/src/modules/newsletter-campaign/newsletter-campaign.zod"
import { sendNewsletterTestMutation } from "~/src/modules/newsletter-campaign/use-cases/send-newsletter-test"

import { useNewsletterDelivery } from "~/src/presentation/components/custom/pages/admin/marketing/hooks/use-newsletter-delivery"

type ComposeValues = NewsletterCampaign["composeValues"]

const composeResolver = zodResolver(newsletterCampaignZodSchemas.composeValues)

const EMPTY_COMPOSE_VALUES: ComposeValues = {
  bodies: { "en-US": "", "pl-PL": "" },
  subjects: { "en-US": "", "pl-PL": "" },
}

export const localesWithErrors = (errors: FieldErrors<ComposeValues>): SupportedLocale[] =>
  I18N.SUPPORTED_LOCALES.filter((locale) => errors.subjects?.[locale] !== undefined || errors.bodies?.[locale] !== undefined)

export const useNewsletterComposer = () => {
  const t = useTranslations("pages.admin.marketing.composer.toast")
  const localeNames = useTranslations("pages.admin.content.editor.localeNames")
  const [activeLocale, setActiveLocale] = useState<SupportedLocale>(I18N.DEFAULT_LOCALE)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const delivered = useRef(false)
  const form = useForm<ComposeValues>({ defaultValues: EMPTY_COMPOSE_VALUES, resolver: composeResolver })
  const { isDirty } = form.formState
  const keepsUnsentLetter = (): boolean => isDirty && !delivered.current
  const leaveGuard = useBlocker({ enableBeforeUnload: keepsUnsentLetter, shouldBlockFn: keepsUnsentLetter, withResolver: true })
  const test = useMutation(sendNewsletterTestMutation)
  const { deliver, isDelivering } = useNewsletterDelivery({
    onDelivered: () => {
      delivered.current = true
    },
  })

  const reportInvalid = (errors: FieldErrors<ComposeValues>): void => {
    const locales = localesWithErrors(errors)
    const [firstLocale = activeLocale] = locales
    setActiveLocale(firstLocale)
    toast.error(t("invalidTitle"), {
      description: t("invalidDescription", { locales: locales.map((locale) => localeNames(locale)).join(", ") }),
    })
  }

  const sendTest = form.handleSubmit((values) => {
    test.mutate(values, {
      onError: () => {
        toast.error(t("testFailedTitle"), { description: t("testFailedDescription") })
      },
      onSuccess: ({ email }) => {
        toast.success(t("testSentTitle"), { description: t("testSentDescription", { email }) })
      },
    })
  }, reportInvalid)

  const requestDelivery = form.handleSubmit(() => {
    setConfirmOpen(true)
  }, reportInvalid)

  const confirmDelivery = form.handleSubmit((values) => {
    deliver(values, () => {
      setConfirmOpen(false)
    })
  })

  return {
    activeLocale,
    confirmDelivery,
    confirmOpen,
    form,
    isDelivering,
    isTesting: test.isPending,
    leaveGuard,
    requestDelivery,
    sendTest,
    setActiveLocale,
    setConfirmOpen,
  }
}
