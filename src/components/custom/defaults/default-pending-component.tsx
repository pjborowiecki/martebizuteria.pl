import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { TranslationsProvider } from "~/src/providers/translations-provider";

function PendingContent(): JSX.Element {
  const t = useTranslations("components.custom.defaultPendingComponent");

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="animate-pulse text-sm text-muted-foreground">{t("loading")}</p>
    </div>
  );
}

export function DefaultPendingComponent(): JSX.Element {
  return (
    <TranslationsProvider>
      <PendingContent />
    </TranslationsProvider>
  );
}
