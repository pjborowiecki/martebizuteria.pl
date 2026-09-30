import { type JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Separator } from "~/src/presentation/components/shadcn/separator"

export const ManifestoSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.manifestoSection")

  return (
    <section className="bg-secondary/40 py-24 lg:py-36">
      <div className="reveal mx-auto max-w-3xl space-y-8 px-6 text-center lg:px-12">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h2 className="font-serif text-4xl leading-tight md:text-5xl lg:text-6xl">
          {t("title")}
          <br />
          <span className="italic">{t("subtitle")}</span>
        </h2>
        <Separator className="line-reveal mx-auto max-w-16 bg-foreground/30" />
        <div className="mx-auto max-w-2xl space-y-6">
          <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("paragraph1")}</p>
          <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("paragraph2")}</p>
        </div>
        <p className="pt-4 font-serif text-lg text-foreground/80 italic">{t("closing")}</p>
      </div>
    </section>
  )
}
