import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

export const BreakerSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.breakerSection")

  return (
    <section className="storefront-container pb-16 lg:pb-24">
      <div className="reveal py-16 text-center sm:px-8">
        <p className="font-serif text-4xl leading-tight italic md:text-5xl">{t("text")}</p>
      </div>
    </section>
  )
}
