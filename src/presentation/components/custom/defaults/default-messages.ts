import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import enMessages from "~/messages/en-US/components.defaults.json"
import plMessages from "~/messages/pl-PL/components.defaults.json"

const DEFAULT_COMPONENT_MESSAGES = {
  "en-US": enMessages,
  "pl-PL": plMessages,
} as const satisfies Record<SupportedLocale, unknown>

export const getDefaultComponentMessages = (locale: SupportedLocale) => DEFAULT_COMPONENT_MESSAGES[locale]
