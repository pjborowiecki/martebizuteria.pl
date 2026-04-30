import type { JSX } from "react";

import { useTranslations } from "use-intl";

export function DefaultNotFoundComponent(): JSX.Element {
  const t = useTranslations("components.custom.defaultNotFoundComponent");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 p-4">
      <h2 className="font-semibold">{t("heading")}</h2>
      <p className="text-sm text-muted-foreground">{t("message")}</p>
    </div>
  );
}
