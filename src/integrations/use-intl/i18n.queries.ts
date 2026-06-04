import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import { CONSTANTS } from "~/src/constants";
import type { Locale } from "~/src/constants/types";

import { getMessagesBundle } from "~/src/integrations/use-intl/i18n.bundles";
import type { Messages } from "~/src/integrations/use-intl/i18n.types";

export type { Messages };

export function getMessagesForLocale(locale: Locale): Messages {
  return getMessagesBundle(locale);
}

export const fetchMessages = createServerFn({ method: "GET" })
  .inputValidator((locale: Locale): Locale => locale)
  .handler(({ data: locale }) => getMessagesForLocale(locale));

export const messagesQueryOptions = (locale: Locale) =>
  queryOptions({
    gcTime: Infinity,
    queryFn: () => fetchMessages({ data: locale }),
    queryKey: CONSTANTS.QUERY_KEYS.MESSAGES.byLocale(locale),
    staleTime: Infinity
  });
