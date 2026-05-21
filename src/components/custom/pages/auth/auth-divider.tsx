import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { Separator } from "~/src/components/shadcn/separator";

export function AuthDivider(): JSX.Element {
  const t = useTranslations("components.custom.authDivider");

  return (
    <div className="flex items-center gap-4">
      <Separator className="flex-1 bg-border/50" />
      <span className="text-[10px] tracking-[0.2em] text-muted-foreground/60 uppercase">{t("or")}</span>
      <Separator className="flex-1 bg-border/50" />
    </div>
  );
}
