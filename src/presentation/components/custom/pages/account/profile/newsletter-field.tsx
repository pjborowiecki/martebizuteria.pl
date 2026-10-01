import { type JSX, useCallback } from "react"

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { NEWSLETTER_QUERY_KEYS, NEWSLETTER_SOURCE, NEWSLETTER_STATUS } from "~/src/modules/newsletter/newsletter.constants"
import { getOwnNewsletterSubscriptionQuery } from "~/src/modules/newsletter/use-cases/get-own-newsletter-subscription"
import { subscribeToNewsletterMutation } from "~/src/modules/newsletter/use-cases/subscribe-to-newsletter"
import { unsubscribeOwnNewsletterMutation } from "~/src/modules/newsletter/use-cases/unsubscribe-own-newsletter"

import { Button } from "~/src/presentation/components/shadcn/button"

export const NewsletterField = ({ email }: Readonly<{ email: string }>): JSX.Element => {
  const t = useTranslations("pages.account.profile")
  const queryClient = useQueryClient()
  const { data: subscription } = useQuery(getOwnNewsletterSubscriptionQuery())
  const subscribe = useMutation(subscribeToNewsletterMutation)
  const unsubscribe = useMutation(unsubscribeOwnNewsletterMutation)
  const status = subscription?.status
  const pending = subscribe.isPending || unsubscribe.isPending
  const subscribed = status === NEWSLETTER_STATUS.CONFIRMED || status === NEWSLETTER_STATUS.PENDING

  const refresh = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: NEWSLETTER_QUERY_KEYS.OWN_SUBSCRIPTION })
  }, [queryClient])

  const handleSubscribe = useCallback(() => {
    subscribe.mutate(
      { email, source: NEWSLETTER_SOURCE.ACCOUNT },
      {
        onError: () => {
          toast.error(t("newsletterError"))
        },
        onSuccess: () => {
          refresh()
          toast.success(t("newsletterConfirmationSent"))
        },
      },
    )
  }, [email, refresh, subscribe, t])

  const handleUnsubscribe = useCallback(() => {
    unsubscribe.mutate(undefined, {
      onError: () => {
        toast.error(t("newsletterError"))
      },
      onSuccess: () => {
        refresh()
        toast.success(t("newsletterUnsubscribed"))
      },
    })
  }, [refresh, t, unsubscribe])

  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0">
        <p className="text-[11px] tracking-widest text-muted-foreground uppercase">{t("newsletter")}</p>
        <p className="mt-1.5 text-[14px]">{t(statusKey(status))}</p>
      </div>
      <Button disabled={pending} onClick={subscribed ? handleUnsubscribe : handleSubscribe} size="account-sm" variant="account-ghost">
        {t(subscribed ? "newsletterUnsubscribeAction" : "newsletterSubscribeAction")}
      </Button>
    </div>
  )
}

const statusKey = (status: string | undefined): "newsletterPending" | "notSubscribed" | "subscribed" => {
  if (status === NEWSLETTER_STATUS.CONFIRMED) {
    return "subscribed"
  }

  return status === NEWSLETTER_STATUS.PENDING ? "newsletterPending" : "notSubscribed"
}
