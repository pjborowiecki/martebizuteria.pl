import enMessages from "~/messages/en/components.defaults.json"
import plMessages from "~/messages/pl/components.defaults.json"

// Error and pending boundaries must render even when a translation chunk fails.
export const DEFAULT_MESSAGES = { en: enMessages, pl: plMessages } as const
