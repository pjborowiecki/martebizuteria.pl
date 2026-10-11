import { useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useNavigate } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import {
  NEWSLETTER_CAMPAIGN_ERROR_CODES,
  NEWSLETTER_CAMPAIGN_QUERY_KEYS,
} from "~/src/modules/newsletter-campaign/newsletter-campaign.constants"
import { type NewsletterCampaign } from "~/src/modules/newsletter-campaign/newsletter-campaign.types"
import { sendNewsletterCampaignMutation } from "~/src/modules/newsletter-campaign/use-cases/send-newsletter-campaign"
import { NEWSLETTER_QUERY_KEYS } from "~/src/modules/newsletter/newsletter.constants"

import { ROUTES } from "~/src/routes"

export const useNewsletterDelivery = ({ onDelivered }: Readonly<{ onDelivered: () => void }>) => {
  const t = useTranslations("pages.admin.marketing.composer.toast")
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [campaignId] = useState(() => crypto.randomUUID())
  const { isPending, mutate } = useMutation(sendNewsletterCampaignMutation)

  const showCampaigns = async (): Promise<void> => {
    onDelivered()
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: NEWSLETTER_CAMPAIGN_QUERY_KEYS.ADMIN.LIST }),
      queryClient.invalidateQueries({ queryKey: NEWSLETTER_QUERY_KEYS.ADMIN.STATS }),
    ])
    await navigate({ to: ROUTES.ADMIN_MARKETING })
  }

  const reportFailure = (error: Error): void => {
    if (error.message === NEWSLETTER_CAMPAIGN_ERROR_CODES.ALREADY_SENT) {
      toast.error(t("alreadySentTitle"), { description: t("alreadySentDescription") })
      void showCampaigns()

      return
    }

    if (error.message === NEWSLETTER_CAMPAIGN_ERROR_CODES.NO_RECIPIENTS) {
      toast.error(t("noRecipientsTitle"), { description: t("noRecipientsDescription") })

      return
    }

    toast.error(t("errorTitle"), { description: t("errorDescription") })
  }

  const deliver = (values: NewsletterCampaign["composeValues"], onSettled: () => void): void => {
    mutate(
      { ...values, id: campaignId },
      {
        onError: reportFailure,
        onSettled,
        onSuccess: ({ recipientCount }) => {
          toast.success(t("sentTitle"), { description: t("sentDescription", { count: recipientCount }) })
          void showCampaigns()
        },
      },
    )
  }

  return { deliver, isDelivering: isPending }
}
