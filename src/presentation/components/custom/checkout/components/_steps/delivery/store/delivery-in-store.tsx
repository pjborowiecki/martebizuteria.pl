import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

export const DeliveryInStore = (): JSX.Element => {
  const t = useTranslations("pages.checkout.checkoutForm")

  return (
    <div className="flex flex-col gap-4 rounded-none border border-border/50 bg-background p-5">
      <p className="text-[13px] font-medium tracking-[0.15em] text-foreground uppercase">{t("deliverySubsteps.inStoreTitle")}</p>
      <p className="text-sm leading-relaxed text-muted-foreground">{t("deliverySubsteps.inStoreText")}</p>
    </div>
  )
}
