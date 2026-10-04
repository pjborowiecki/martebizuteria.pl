import { type JSX, Suspense, useCallback, useMemo, useRef, useState } from "react"

import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { ClientOnly, createFileRoute } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { accountPageMeta } from "~/src/modules/customer-account/customer-account.meta"
import { createCardSetupIntentMutation } from "~/src/modules/payment/use-cases/create-card-setup-intent"
import { listSavedPaymentMethodsQuery } from "~/src/modules/payment/use-cases/list-saved-payment-methods"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Separator } from "~/src/presentation/components/shadcn/separator"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { LazyAddCardForm } from "~/src/presentation/components/custom/pages/account/payment/add-card-form-loader.client"
import { SavedCardList } from "~/src/presentation/components/custom/pages/account/payment/saved-card-list"

const PaymentPage = (): JSX.Element => {
  const t = useTranslations("pages.account.payment")
  const { data: methods } = useSuspenseQuery(listSavedPaymentMethodsQuery())
  const [isAddingCard, setIsAddingCard] = useState(false)
  const addCardButtonRef = useRef<HTMLButtonElement>(null)
  const setupIntent = useMutation({
    ...createCardSetupIntentMutation,
    onError: () => {
      toast.error(t("formUnavailable"))
    },
    onSuccess: () => {
      setIsAddingCard(true)
    },
  })
  const { data: openIntent, mutate: openSetupIntent, reset: resetSetupIntent } = setupIntent
  const formFallback = useMemo(() => <Skeleton className="my-6 h-40 w-full rounded-none" />, [])

  const handleAddCard = useCallback(() => {
    if (openIntent === undefined) {
      openSetupIntent()
    } else {
      setIsAddingCard(true)
    }
  }, [openIntent, openSetupIntent])

  const closeForm = useCallback(() => {
    setIsAddingCard(false)
    addCardButtonRef.current?.focus()
  }, [])

  const handleSetupEnded = useCallback(() => {
    closeForm()
    resetSetupIntent()
  }, [closeForm, resetSetupIntent])

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
        <p className="max-w-lg text-[14px] leading-relaxed text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          {t("saved")} ({methods.length})
        </h2>
        <Button
          ref={addCardButtonRef}
          className="flex items-center gap-1.5 data-disabled:opacity-50"
          disabled={isAddingCard || setupIntent.isPending}
          focusableWhenDisabled
          onClick={handleAddCard}
          variant="account-ghost"
        >
          <Plus className="size-3.5" strokeWidth={1.5} />
          {t("addCard")}
        </Button>
      </div>
      <Separator className="mt-3 mb-0" />

      {isAddingCard && openIntent !== undefined && (
        <ClientOnly fallback={formFallback}>
          <Suspense fallback={formFallback}>
            <LazyAddCardForm clientSecret={openIntent.clientSecret} onCancel={closeForm} onSetupEnded={handleSetupEnded} />
          </Suspense>
        </ClientOnly>
      )}

      <SavedCardList methods={methods} />

      <Separator className="my-10" />

      <div className="space-y-2">
        <p className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">{t("securityNote")}</p>
        <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground/70">{t("securityDesc")}</p>
      </div>
    </div>
  )
}

export const Route = createFileRoute("/account/payment")({
  component: PaymentPage,
  head: pageHead,
  loader: async ({ context }) => {
    await context.queryClient.query({ ...listSavedPaymentMethodsQuery(), staleTime: "static" })

    return accountPageMeta(context.queryClient, context.locale, "payment")
  },
})
