import { type AbstractIntlMessages } from "use-intl"

import { type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { buildMessageTree, toNamespace } from "~/src/integrations/use-intl/i18n.messages"

export const TEST_LOCALE: SupportedLocale = "en-US"

const modules = import.meta.glob<AbstractIntlMessages>("../../../../messages/en-US/*.json", { eager: true, import: "default" })

export const TEST_MESSAGES = buildMessageTree(Object.entries(modules).map(([path, messages]) => [toNamespace(path), messages]))
