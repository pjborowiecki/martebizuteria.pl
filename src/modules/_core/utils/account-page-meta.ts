import { type QueryClient } from "@tanstack/react-query"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { type PageMeta } from "~/src/lib/seo"

import { APP_NAME } from "~/src/presentation/branding/app"

import type accountMessages from "~/messages/en-US/pages.account.json"
import type accountMetaMessages from "~/messages/en-US/pages.account.meta.json"

export type AccountSection = keyof (typeof accountMessages)["sidebar"]

export const accountPageMeta = async (queryClient: QueryClient, locale: SupportedLocale, section: AccountSection): Promise<PageMeta> => {
  const [sections, meta] = await Promise.all([
    queryClient.query(messagesQueryOptions<typeof accountMessages>({ locale, namespace: "pages.account" })),
    queryClient.query(messagesQueryOptions<typeof accountMetaMessages>({ locale, namespace: "pages.account.meta" })),
  ])

  return {
    description: meta.description,
    title: `${sections.sidebar[section]} | ${APP_NAME}`,
  }
}
