import type { JSX } from "react";

import { createFileRoute } from "@tanstack/react-router";
import { CreditCard } from "lucide-react";
import { useTranslations } from "use-intl";

import { Separator } from "~/src/components/shadcn/separator";

export const Route = createFileRoute("/{-$locale}/account/payment")({
  component: PaymentPage
});

const ZERO_METHODS = 0;

function PaymentPage(): JSX.Element {
  const t = useTranslations("pages.account.payment");

  return (
    <div>
      <div className="mb-10 space-y-3">
        <p className="text-[10px] tracking-[0.24em] text-muted-foreground uppercase">{t("eyebrow")}</p>
        <h1 className="font-serif text-4xl leading-[0.94] tracking-tight lg:text-5xl">{t("title")}</h1>
      </div>

      <div className="flex items-baseline justify-between">
        <h2 className="text-[11px] tracking-[0.2em] text-muted-foreground uppercase">
          {t("saved")} ({ZERO_METHODS})
        </h2>
      </div>
      <Separator className="mt-3 mb-0" />

      <div className="flex flex-col items-center gap-4 py-16 text-center">
        <CreditCard className="size-8 text-muted-foreground/30" strokeWidth={1} />
        <p className="max-w-md text-sm text-muted-foreground">{t("empty")}</p>
      </div>

      <Separator className="my-10" />

      <div className="space-y-2">
        <p className="text-[11px] tracking-[0.15em] text-muted-foreground uppercase">{t("securityNote")}</p>
        <p className="max-w-md text-[12px] leading-relaxed text-muted-foreground/70">{t("securityDesc")}</p>
      </div>
    </div>
  );
}
