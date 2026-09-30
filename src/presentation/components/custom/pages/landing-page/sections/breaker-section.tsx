import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

export const BreakerSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.breakerSection")

  return (
    <section className="mx-auto max-w-400 px-6 pb-16 lg:px-12 lg:pb-24">
      <div className="reveal px-8 py-16 text-center">
        <p className="font-serif text-4xl leading-tight italic md:text-5xl">{t("text")}</p>
      </div>
    </section>
  )
}
