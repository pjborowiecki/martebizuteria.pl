import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Separator } from "~/src/components/shadcn/separator";

export function PhilosophySection(): JSX.Element {
  const t = useTranslations("landingPage.philosophySection");

  return (
    <section className="mx-auto max-w-400 px-6 pb-20 lg:px-12 lg:pb-28">
      <div className="reveal mx-auto max-w-3xl space-y-6 text-center">
        <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
        <Separator className="line-reveal mx-auto max-w-16 bg-foreground/30" />
        <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("paragraph1")}</p>
        <p className="text-base/relaxed text-muted-foreground md:text-lg/relaxed">{t("paragraph2")}</p>
        <p className="pt-2 text-[11px] tracking-[0.2em] text-muted-foreground/70 uppercase">{t("signature")}</p>
      </div>
    </section>
  );
}
