import type { JSX } from "react";

import { ArrowRight } from "lucide-react";
import { useTranslations } from "use-intl";

import { Input } from "~/src/components/shadcn/input";

export function NewsletterSection(): JSX.Element {
  const t = useTranslations("pages.landing.newsletterSection");

  return (
    <section className="bg-secondary/40 py-20 lg:py-28">
      <div className="reveal mx-auto max-w-400 px-6 lg:px-12">
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <p className="text-[10px] tracking-[0.28em] text-muted-foreground uppercase">{t("eyebrow")}</p>
          <h2 className="font-serif text-4xl leading-tight md:text-5xl">{t("title")}</h2>
          <p className="mx-auto max-w-lg text-base/relaxed text-foreground/60 md:text-lg/relaxed">{t("description")}</p>
        </div>

        <div className="mx-auto mt-10 max-w-2xl lg:mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Input
              placeholder={t("placeholder")}
              aria-label={t("placeholder")}
              className="h-13 flex-1 rounded-none border-border/60 bg-background px-5 text-sm placeholder:text-muted-foreground/50 focus-visible:ring-foreground/20"
            />
            <button
              type="button"
              className="inline-flex h-13 shrink-0 items-center justify-center gap-2.5 rounded-none bg-primary px-10 text-sm font-medium tracking-wide text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("cta")}
              <ArrowRight className="size-4" />
            </button>
          </div>
          <p className="mt-4 text-center text-[11px] leading-relaxed text-muted-foreground/60">{t("note")}</p>
        </div>
      </div>
    </section>
  );
}
