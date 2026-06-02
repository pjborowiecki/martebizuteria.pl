import type { ReactNode } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useRouterState } from "@tanstack/react-router";
import { IntlProvider } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";
import { useTimeZone } from "~/src/integrations/use-intl/i18n.timezone";

interface TranslationsProviderProps {
  children: ReactNode;
  locale?: Locale;
}

export function TranslationsProvider({ children, locale: propLocale }: Readonly<TranslationsProviderProps>) {
  const routerState = useRouterState();

  const pathLocale = CONSTANTS.LOCALES.find(
    (loc) => routerState.location.pathname.startsWith(`/${loc}/`) || routerState.location.pathname === `/${loc}`
  );

  const locale = propLocale ?? pathLocale ?? CONSTANTS.DEFAULT_LOCALE;

  const { data: messages } = useSuspenseQuery(messagesQueryOptions(locale));
  const timeZone = useTimeZone();

  return (
    <IntlProvider locale={locale} messages={messages} timeZone={timeZone}>
      {children}
    </IntlProvider>
  );
}
