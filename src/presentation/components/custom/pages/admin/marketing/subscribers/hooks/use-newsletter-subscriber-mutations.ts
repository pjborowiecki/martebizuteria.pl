import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { syncQueryInvalidation } from "~/src/integrations/tanstack-query/query.sync"

import { ERROR_CODES, errorCode } from "~/src/modules/_core/constants/errors"
import { NEWSLETTER_QUERY_KEYS } from "~/src/modules/newsletter/newsletter.constants"
import { eraseNewsletterSubscriberMutation } from "~/src/modules/newsletter/use-cases/erase-newsletter-subscriber"
import { unsubscribeNewsletterSubscriberMutation } from "~/src/modules/newsletter/use-cases/unsubscribe-newsletter-subscriber"

const useSubscriberMutationFeedback = (errorTitleKey: "eraseDialog.errorTitle" | "unsubscribeDialog.errorTitle") => {
  const t = useTranslations("pages.admin.marketing.subscribers")
  const queryClient = useQueryClient()

  return {
    onError: (error: Error) => {
      toast.error(t(errorTitleKey), {
        description: t(errorCode(error) === ERROR_CODES.NOT_FOUND ? "toast.notFoundDescription" : "toast.errorDescription"),
      })
    },
    onSettled: () => {
      void syncQueryInvalidation(queryClient, NEWSLETTER_QUERY_KEYS.ADMIN.ALL)
    },
  }
}

export const useUnsubscribeNewsletterSubscriber = () =>
  useMutation({ ...unsubscribeNewsletterSubscriberMutation, ...useSubscriberMutationFeedback("unsubscribeDialog.errorTitle") })

export const useEraseNewsletterSubscriber = () =>
  useMutation({ ...eraseNewsletterSubscriberMutation, ...useSubscriberMutationFeedback("eraseDialog.errorTitle") })
