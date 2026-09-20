import { Globe, Lock, type LucideIcon, Paintbrush, Settings, Truck, User } from "lucide-react"

export const SETTINGS_TABS = ["general", "account", "shipping", "appearance", "security", "localization"] as const
export type SettingsTab = (typeof SETTINGS_TABS)[number]

export interface SettingsTabDefinition {
  readonly icon: LucideIcon
  readonly key: SettingsTab
}

export const SETTINGS_TAB_DEFINITIONS: readonly SettingsTabDefinition[] = [
  { icon: Settings, key: "general" },
  { icon: User, key: "account" },
  { icon: Truck, key: "shipping" },
  { icon: Paintbrush, key: "appearance" },
  { icon: Lock, key: "security" },
  { icon: Globe, key: "localization" },
]

export const TOGGLE_SETTING_KEYS = ["maintenance", "inventoryTracking", "autoFulfillment", "orderConfirmation"] as const
export type ToggleSettingKey = (typeof TOGGLE_SETTING_KEYS)[number]

export const STORE_INFO_DEFAULTS = {
  description: "Luxury contemporary jewelry, handcrafted in Europe.",
  email: "contact@marte.co",
  name: "M'ARTE",
} as const
