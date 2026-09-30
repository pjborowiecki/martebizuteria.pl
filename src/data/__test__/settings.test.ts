import { describe, expect, it } from "vite-plus/test"

import { SETTINGS_TABS, SETTINGS_TAB_DEFINITIONS, STORE_INFO_DEFAULTS, TOGGLE_SETTING_KEYS } from "~/src/data/settings"

describe("SETTINGS_TAB_DEFINITIONS", () => {
  it("defines one entry per declared tab, in the same order", () => {
    expect(SETTINGS_TAB_DEFINITIONS.map((definition) => definition.key)).toStrictEqual([...SETTINGS_TABS])
  })

  it("gives every tab its own icon", () => {
    const icons = SETTINGS_TAB_DEFINITIONS.map((definition) => definition.icon)

    expect(new Set(icons).size).toBe(icons.length)
  })
})

describe("TOGGLE_SETTING_KEYS", () => {
  it("lists every toggle once", () => {
    expect(new Set(TOGGLE_SETTING_KEYS).size).toBe(TOGGLE_SETTING_KEYS.length)
  })

  it("does not overlap with the tab names", () => {
    for (const key of TOGGLE_SETTING_KEYS) {
      expect(SETTINGS_TABS).not.toContain(key)
    }
  })
})

describe("STORE_INFO_DEFAULTS", () => {
  it("defaults to a contact address on the store domain", () => {
    expect(STORE_INFO_DEFAULTS.email).toBe("contact@marte.co")
  })

  it("fills in a store name and description", () => {
    expect(STORE_INFO_DEFAULTS.name).toBe("M'ARTE")
    expect(STORE_INFO_DEFAULTS.description.length).toBeGreaterThan(0)
  })
})
