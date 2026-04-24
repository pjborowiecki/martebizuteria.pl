import type { ReactNode } from "react";

import { useSuspenseQuery } from "@tanstack/react-query";
import { IntlProvider } from "use-intl";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.queries";

interface TranslationsProviderProps {
  children: ReactNode;
  locale: Locale;
}

export function TranslationsProvider({ children, locale }: Readonly<TranslationsProviderProps>) {
  const { data: messages } = useSuspenseQuery(messagesQueryOptions(locale));

  return (
    <IntlProvider locale={locale} messages={messages} timeZone={CONSTANTS.DEFAULT_TIMEZONE}>
      {children}
    </IntlProvider>
  );
}
