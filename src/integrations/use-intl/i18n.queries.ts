import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";

import type { Locale } from "~/src/constants/types";

import type en from "~/messages/en.json";

export type Messages = typeof en;

const messageFiles = import.meta.glob<{ readonly default: Messages }>("../../../messages/*.json", {
  eager: true
});

export function getMessagesForLocale(locale: Locale): Messages {
  const file = messageFiles[`../../../messages/${locale}.json`];

  if (file === undefined) {
    throw new Error(`[i18n] Critical: Missing translation file for locale '${locale}'`);
  }

  return file.default;
}

export const fetchMessages = createServerFn({ method: "GET" })
  .inputValidator((locale: Locale): Locale => locale)
  .handler(({ data: locale }) => getMessagesForLocale(locale));

export const messagesQueryOptions = (locale: Locale) =>
  queryOptions({
    gcTime: Infinity,
    queryFn: () => fetchMessages({ data: locale }),
    queryKey: ["messages", locale],
    staleTime: Infinity
  });
