import type { JSX } from "react";

import { useTranslations } from "use-intl";

import { CONSTANTS } from "~/src/constants";

import { LocalizedLink } from "~/src/components/custom/localized-link";

export function AuthHeader({ title, subtitle }: Readonly<{ title: string; subtitle: string }>): JSX.Element {
  const t = useTranslations("components.custom.authHeader");

  return (
    <div className="space-y-6">
      <LocalizedLink to={CONSTANTS.ROUTES.HOME} className="font-serif text-2xl tracking-tight">
        {t("brand")}
      </LocalizedLink>
      <div>
        <h1 className="font-serif text-3xl tracking-tight sm:text-4xl">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
