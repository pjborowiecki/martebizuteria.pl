import { enUS, pl } from "react-day-picker/locale"
import { describe, expect, it } from "vite-plus/test"

import { getDayPickerLocale } from "~/src/integrations/react-day-picker/react-day-picker.locale"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

describe("getDayPickerLocale", () => {
  it("maps each app locale to its date-fns locale", () => {
    expect(getDayPickerLocale("pl-PL")).toBe(pl)
    expect(getDayPickerLocale("en-US")).toBe(enUS)
  })

  it("covers every supported app locale", () => {
    for (const locale of I18N.SUPPORTED_LOCALES) {
      expect(getDayPickerLocale(locale)).toBeDefined()
    }
  })
})
